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

  let body: { guestId?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const guestIdVal = typeof body.guestId === "string" && body.guestId.trim() ? body.guestId.trim() : null;
  if (!guestIdVal) return NextResponse.json({ error: "guestId required" }, { status: 400 });

  const myItems = await prisma.cartItem.findMany({
    where: { orderSessionId: session.id, guestId: guestIdVal },
    include: { dish: { select: { id: true } } },
  });
  if (myItems.length === 0) {
    return NextResponse.json({ submitted: true, count: 0 });
  }

  const submission = await prisma.orderSubmission.create({
    data: {
      orderSessionId: session.id,
      guestId: guestIdVal,
    },
  });
  await prisma.orderSubmissionItem.createMany({
    data: myItems.map((item) => ({
      orderSubmissionId: submission.id,
      dishId: item.dishId,
      quantity: item.quantity,
      priceCents: item.priceCents,
      selections: item.selections,
    })),
  });
  await prisma.cartItem.deleteMany({
    where: { id: { in: myItems.map((i) => i.id) } },
  });

  return NextResponse.json({ submitted: true, count: myItems.length });
}
