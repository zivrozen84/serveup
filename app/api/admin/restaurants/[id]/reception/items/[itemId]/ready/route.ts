import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** PATCH – סימון פריט בודד כ־מוכן */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const restaurantId = parseInt((await params).id, 10);
  const itemId = parseInt((await params).itemId, 10);
  if (isNaN(restaurantId) || isNaN(itemId))
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const item = await prisma.orderSubmissionItem.findUnique({
    where: { id: itemId },
    include: {
      orderSubmission: {
        include: { orderSession: { select: { restaurantId: true } } },
      },
    },
  });

  if (!item || item.orderSubmission.orderSession.restaurantId !== restaurantId)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.orderSubmissionItem.update({
    where: { id: itemId },
    data: { status: "ready" },
  });

  return NextResponse.json({ ok: true });
}
