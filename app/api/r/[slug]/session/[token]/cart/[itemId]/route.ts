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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string; token: string; itemId: string }> }
) {
  const { slug, token, itemId } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, isActive: true },
    select: { id: true },
  });
  if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await getSession(restaurant.id, token);
  if (!session) return NextResponse.json({ error: "Session invalid or expired" }, { status: 410 });

  const id = parseInt(itemId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid item id" }, { status: 400 });

  let body: { quantity?: number; guestId?: string } = {};
  try {
    body = await req.json();
  } catch {
    // no body
  }
  const quantity = body.quantity != null ? Math.max(0, Math.min(10, Number(body.quantity))) : undefined;
  const guestIdVal = typeof body.guestId === "string" && body.guestId.trim() ? body.guestId.trim() : null;
  if (!guestIdVal) return NextResponse.json({ error: "guestId required" }, { status: 400 });

  const item = await prisma.cartItem.findFirst({
    where: { id, orderSessionId: session.id },
  });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (item.guestId !== guestIdVal) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (quantity === 0) {
    await prisma.cartItem.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  }

  if (quantity != null) {
    const updated = await prisma.cartItem.update({
      where: { id },
      data: { quantity },
      include: { dish: { select: { id: true, title: true, imageUrl: true, priceCents: true } } },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json(item);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string; token: string; itemId: string }> }
) {
  const { slug, token, itemId } = await params;
  let guestIdVal: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    guestIdVal = typeof (body as { guestId?: string }).guestId === "string" && (body as { guestId: string }).guestId.trim()
      ? (body as { guestId: string }).guestId.trim()
      : null;
  } catch {
    const url = new URL(req.url);
    guestIdVal = url.searchParams.get("guestId");
    if (guestIdVal) guestIdVal = guestIdVal.trim() || null;
  }
  if (!guestIdVal) return NextResponse.json({ error: "guestId required" }, { status: 400 });

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, isActive: true },
    select: { id: true },
  });
  if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await getSession(restaurant.id, token);
  if (!session) return NextResponse.json({ error: "Session invalid or expired" }, { status: 410 });

  const id = parseInt(itemId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid item id" }, { status: 400 });

  const item = await prisma.cartItem.findFirst({
    where: { id, orderSessionId: session.id },
  });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
  if (item.guestId !== guestIdVal) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.cartItem.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
