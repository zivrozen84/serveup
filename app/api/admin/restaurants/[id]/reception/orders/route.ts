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
    select: {
      id: true,
      receptionDontNotifyReady: true,
      receptionAutoDeleteMinutes: true,
    },
  });
  if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const tableIdParam = searchParams.get("tableId");
  const tableIdFilter = tableIdParam ? parseInt(tableIdParam, 10) : null;

  const now = new Date();
  const autoDeleteMinutes = restaurant.receptionDontNotifyReady && restaurant.receptionAutoDeleteMinutes != null
    ? restaurant.receptionAutoDeleteMinutes
    : null;

  if (autoDeleteMinutes != null) {
    const cutoff = new Date(now.getTime() - autoDeleteMinutes * 60 * 1000);
    await prisma.orderSubmission.deleteMany({
      where: {
        orderSession: { restaurantId: id },
        submittedAt: { lt: cutoff },
      },
    });
  }

  const sessions = await prisma.orderSession.findMany({
    where: {
      restaurantId: id,
      status: "active",
      expiresAt: { gt: now },
      ...(tableIdFilter != null && !isNaN(tableIdFilter) ? { tableId: tableIdFilter } : {}),
    },
    select: { id: true },
  });
  const sessionIds = sessions.map((s) => s.id);

  const submissions = await prisma.orderSubmission.findMany({
    where: { orderSessionId: { in: sessionIds }, status: "pending" },
    orderBy: { submittedAt: "asc" },
    include: {
      orderSession: {
        select: {
          id: true,
          token: true,
          label: true,
          tableId: true,
          table: {
            select: { id: true, tableNumber: true, label: true },
          },
        },
      },
      items: {
        include: {
          dish: { select: { id: true, title: true, priceCents: true } },
        },
      },
    },
  });

  return NextResponse.json(
    submissions.map((s) => ({
      id: s.id,
      guestId: s.guestId,
      submittedAt: s.submittedAt.toISOString(),
      status: s.status,
      session: s.orderSession,
      items: s.items.map((i) => ({
        id: i.id,
        dishId: i.dishId,
        dishTitle: i.dish.title,
        quantity: i.quantity,
        priceCents: i.priceCents,
        selections: i.selections,
      })),
    }))
  );
}
