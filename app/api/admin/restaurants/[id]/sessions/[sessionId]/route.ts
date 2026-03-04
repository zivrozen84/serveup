import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const EXTEND_MINUTES = 30;

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt((await params).id, 10);
  const sessionId = parseInt((await params).sessionId, 10);
  if (isNaN(id) || isNaN(sessionId))
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const orderSession = await prisma.orderSession.findFirst({
    where: { id: sessionId, restaurantId: id },
  });
  if (!orderSession) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  let body: { action?: "extend" | "close" } = {};
  try {
    body = await req.json();
  } catch {
    // no body
  }

  if (body.action === "close") {
    await prisma.orderSession.update({
      where: { id: sessionId },
      data: { status: "closed" },
    });
    return NextResponse.json({ status: "closed" });
  }

  if (body.action === "extend" || !body.action) {
    const newExpires = new Date(Date.now() + EXTEND_MINUTES * 60 * 1000);
    const updated = await prisma.orderSession.update({
      where: { id: sessionId },
      data: { expiresAt: newExpires },
    });
    return NextResponse.json({
      status: updated.status,
      expiresAt: updated.expiresAt.toISOString(),
      minutesLeft: EXTEND_MINUTES,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
