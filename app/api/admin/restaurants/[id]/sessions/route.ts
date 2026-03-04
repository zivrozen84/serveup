import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt((await params).id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const activeOnly = searchParams.get("active") !== "false";

  const where: { restaurantId: number; status?: string; expiresAt?: { gt: Date } } = {
    restaurantId: id,
  };
  if (activeOnly) {
    where.status = "active";
    where.expiresAt = { gt: new Date() };
  }

  const sessions = await prisma.orderSession.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      table: { select: { id: true, label: true, tableNumber: true } },
      _count: { select: { cartItems: true } },
    },
  });

  return NextResponse.json(
    sessions.map((s) => ({
      id: s.id,
      token: s.token,
      label: s.label,
      tableId: s.tableId,
      table: s.table,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      cartItemsCount: s._count.cartItems,
      minutesLeft: Math.max(0, Math.round((s.expiresAt.getTime() - Date.now()) / 60000)),
    }))
  );
}
