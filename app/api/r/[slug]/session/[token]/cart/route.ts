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

  let body: { dishId: number; quantity?: number; priceCents: number; selections?: unknown; guestId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const { dishId, quantity = 1, priceCents, selections, guestId } = body;
  if (dishId == null || priceCents == null)
    return NextResponse.json({ error: "dishId and priceCents required" }, { status: 400 });
  const guestIdVal = typeof guestId === "string" && guestId.trim() ? guestId.trim() : null;
  if (!guestIdVal) return NextResponse.json({ error: "guestId required" }, { status: 400 });

  const qty = Math.max(1, Math.min(10, Number(quantity)));
  const dish = await prisma.dish.findFirst({
    where: { id: dishId },
    include: { category: { select: { restaurantId: true } } },
  });
  if (!dish || dish.category.restaurantId !== restaurant.id)
    return NextResponse.json({ error: "Dish not found" }, { status: 404 });

  const item = await prisma.cartItem.create({
    data: {
      orderSessionId: session.id,
      guestId: guestIdVal,
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
  req: Request,
  { params }: { params: Promise<{ slug: string; token: string }> }
) {
  const { slug, token } = await params;
  const guestId = req.nextUrl.searchParams.get("guestId");
  const guestIdVal = typeof guestId === "string" && guestId.trim() ? guestId.trim() : null;
  if (!guestIdVal) return NextResponse.json({ error: "guestId required" }, { status: 400 });

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, isActive: true },
    select: { id: true },
  });
  if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await getSession(restaurant.id, token);
  if (!session) return NextResponse.json({ error: "Session invalid or expired" }, { status: 410 });

  const [myCartItems, submissions] = await Promise.all([
    prisma.cartItem.findMany({
      where: { orderSessionId: session.id, guestId: guestIdVal },
      include: {
        dish: { select: { id: true, title: true, imageUrl: true, priceCents: true } },
      },
    }),
    prisma.orderSubmission.findMany({
      where: { orderSessionId: session.id },
      include: {
        items: {
          include: {
            dish: { select: { id: true, title: true, imageUrl: true, priceCents: true } },
          },
        },
      },
      orderBy: { submittedAt: "asc" },
    }),
  ]);

  const orderedItems = submissions.flatMap((s) =>
    s.items.map((it) => ({
      id: it.id,
      submissionId: s.id,
      guestId: s.guestId,
      dishId: it.dishId,
      dish: it.dish,
      quantity: it.quantity,
      priceCents: it.priceCents,
      selections: it.selections,
    }))
  );

  return NextResponse.json({
    myCart: myCartItems.map((item) => ({
      id: item.id,
      dishId: item.dishId,
      dish: item.dish,
      quantity: item.quantity,
      priceCents: item.priceCents,
      selections: item.selections,
    })),
    orderedItems,
  });
}
