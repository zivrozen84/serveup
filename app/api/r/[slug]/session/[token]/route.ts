import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
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
    where: { restaurantId: restaurant.id, token },
    include: {
      table: { select: { id: true, label: true, tableNumber: true } },
      cartItems: {
        include: {
          dish: {
            select: { id: true, title: true, imageUrl: true, priceCents: true },
          },
        },
      },
    },
  });

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "active")
    return NextResponse.json({ error: "Session closed or expired" }, { status: 410 });
  if (new Date() > session.expiresAt) {
    await prisma.orderSession.update({
      where: { id: session.id },
      data: { status: "expired" },
    });
    return NextResponse.json({ error: "Session expired" }, { status: 410 });
  }

  return NextResponse.json({
    id: session.id,
    token: session.token,
    label: session.label,
    tableId: session.tableId,
    table: session.table,
    status: session.status,
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    cartItems: session.cartItems.map((item) => ({
      id: item.id,
      dishId: item.dishId,
      dish: item.dish,
      quantity: item.quantity,
      priceCents: item.priceCents,
      selections: item.selections,
    })),
  });
}
