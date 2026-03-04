import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getSession(restaurantId: number, token: string) {
  const session = await prisma.orderSession.findFirst({
    where: { restaurantId, token },
  });
  if (!session || session.status !== "active" || new Date() > session.expiresAt)
    return null;
  return session;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string; token: string }> }
) {
  const { slug, token } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, isActive: true },
    select: { id: true },
  });
  if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await getSession(restaurant.id, token);
  if (!session) return NextResponse.json({ error: "Session invalid or expired" }, { status: 410 });

  let body: { dishId: number; quantity?: number; priceCents: number; selections?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { dishId, quantity = 1, priceCents, selections } = body;
  if (dishId == null || priceCents == null)
    return NextResponse.json({ error: "dishId and priceCents required" }, { status: 400 });

  const qty = Math.max(1, Math.min(99, Number(quantity)));
  const dish = await prisma.dish.findFirst({
    where: { id: dishId },
    include: { category: { select: { restaurantId: true } } },
  });
  if (!dish || dish.category.restaurantId !== restaurant.id)
    return NextResponse.json({ error: "Dish not found" }, { status: 404 });

  const item = await prisma.cartItem.create({
    data: {
      orderSessionId: session.id,
      dishId,
      quantity: qty,
      priceCents: Number(priceCents),
      selections: selections != null ? (selections as object) : undefined,
    },
    include: {
      dish: { select: { id: true, title: true, imageUrl: true, priceCents: true } },
    },
  });

  return NextResponse.json({
    id: item.id,
    dishId: item.dishId,
    dish: item.dish,
    quantity: item.quantity,
    priceCents: item.priceCents,
    selections: item.selections,
  });
}

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

  const session = await getSession(restaurant.id, token);
  if (!session) return NextResponse.json({ error: "Session invalid or expired" }, { status: 410 });

  const items = await prisma.cartItem.findMany({
    where: { orderSessionId: session.id },
    include: {
      dish: { select: { id: true, title: true, imageUrl: true, priceCents: true } },
    },
  });

  return NextResponse.json(
    items.map((item) => ({
      id: item.id,
      dishId: item.dishId,
      dish: item.dish,
      quantity: item.quantity,
      priceCents: item.priceCents,
      selections: item.selections,
    }))
  );
}
