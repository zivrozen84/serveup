import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OrderSessionProvider } from "@/components/restaurant/OrderSessionContext";
import { OrderSummaryPage } from "./OrderSummaryPage";
import Link from "next/link";

export default async function OrderSummaryRoute({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, isActive: true },
    select: { id: true, name: true, slug: true, priceColor: true },
  });
  if (!restaurant) notFound();

  const session = await prisma.orderSession.findFirst({
    where: { restaurantId: restaurant.id, token },
    include: {
      cartItems: {
        include: {
          dish: { select: { id: true, title: true, imageUrl: true, priceCents: true } },
        },
      },
    },
  });

  if (!session) notFound();
  if (session.status !== "active") notFound();
  if (new Date() > session.expiresAt) notFound();

  const initialCart = session.cartItems.map((item) => ({
    id: item.id,
    dishId: item.dishId,
    dish: item.dish,
    quantity: item.quantity,
    priceCents: item.priceCents,
    selections: item.selections,
  }));

  return (
    <OrderSessionProvider
      slug={slug}
      token={token}
      expiresAt={session.expiresAt.toISOString()}
      label={session.label}
      initialCart={initialCart}
    >
      <div className="min-h-screen bg-stone-900 flex flex-col" dir="rtl">
        <header className="sticky top-0 z-10 flex items-center gap-4 p-4 border-b border-white/10 bg-stone-900/95 backdrop-blur">
          <Link
            href={`/r/${slug}/order/${token}`}
            className="flex items-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-base no-underline min-h-[48px]"
            aria-label="חזרה לתפריט"
          >
            <span className="text-xl leading-none" aria-hidden>←</span>
            <span>חזרה לתפריט</span>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-white truncate">{restaurant.name}</h1>
            <p className="text-sm text-white/60">סוכם הזמנה</p>
          </div>
        </header>
        <OrderSummaryPage priceColor={(restaurant as { priceColor?: string | null }).priceColor ?? undefined} />
      </div>
    </OrderSessionProvider>
  );
}
