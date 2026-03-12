import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const restaurantId = parseInt((await params).id, 10);
  const submissionId = parseInt((await params).submissionId, 10);
  if (isNaN(restaurantId) || isNaN(submissionId))
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const submission = await prisma.orderSubmission.findFirst({
    where: {
      id: submissionId,
      orderSession: { restaurantId },
    },
  });
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.orderSubmission.update({
    where: { id: submissionId },
    data: { status: "ready", readyAt: new Date() },
  });

  await prisma.orderSubmissionItem.updateMany({
    where: { orderSubmissionId: submissionId, status: { not: "canceled" } },
    data: { status: "ready" },
  });

  return NextResponse.json({ ok: true, status: "ready" });
}
