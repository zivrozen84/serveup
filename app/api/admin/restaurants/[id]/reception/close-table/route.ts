import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** POST – סגירת חשבון שולחן: מחיקת כל הסשנים של השולחן (ועגלות והזמנות במסגרת) */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const restaurantId = parseInt((await params).id, 10);
  if (isNaN(restaurantId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  let body: { tableId?: number } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const tableId = body.tableId;
  if (tableId == null || typeof tableId !== "number")
    return NextResponse.json({ error: "tableId required" }, { status: 400 });

  await prisma.orderSession.deleteMany({
    where: {
      restaurantId,
      tableId,
    },
  });

  return NextResponse.json({ ok: true });
}
