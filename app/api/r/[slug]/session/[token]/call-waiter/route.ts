import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** POST – סשן טרמינל קורא למלצר (רק אם יש tableId) */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string; token: string }> }
) {
  const { slug, token } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, isActive: true },
    select: { id: true },
  });
  if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await prisma.orderSession.findFirst({
    where: { restaurantId: restaurant.id, token, status: "active" },
    select: { id: true, tableId: true, expiresAt: true },
  });
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (new Date() > session.expiresAt)
    return NextResponse.json({ error: "Session expired" }, { status: 410 });
  if (session.tableId == null)
    return NextResponse.json({ error: "No table linked" }, { status: 400 });

  await prisma.orderSession.update({
    where: { id: session.id },
    data: { callingWaiterAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
