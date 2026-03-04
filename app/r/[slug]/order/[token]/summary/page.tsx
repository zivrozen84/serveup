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
    select: {
      id: true,
      name: true,
      slug: true,
      priceColor: true,
      primaryColor: true,
      textColor: true,
      descriptionColor: true,
      cartColor: true,
      cartTextColor: true,
      frameUrl: true,
      cartBackgroundUrl: true,
      summaryCardColor: true,
    },
  });
  if (!restaurant) notFound();

  const [session, menuData] = await Promise.all([
    prisma.orderSession.findFirst({
      where: { restaurantId: restaurant.id, token },
      include: {
        cartItems: {
          include: {
            dish: { select: { id: true, title: true, imageUrl: true, priceCents: true } },
          },
        },
      },
    }),
    prisma.restaurant.findUnique({
      where: { id: restaurant.id },
      select: {
        categories: {
          orderBy: { sortOrder: "asc" },
          select: {
            dishes: {
              orderBy: { sortOrder: "asc" },
              include: {
                paramCategories: {
                  orderBy: { sortOrder: "asc" },
                  include: { parameters: { orderBy: { sortOrder: "asc" } } },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const menuDishes = menuData?.categories?.flatMap((c) => c.dishes) ?? [];

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

  const cartBackgroundUrl = (restaurant as { cartBackgroundUrl?: string | null }).cartBackgroundUrl ?? null;
  const phoneWidth = 420;
  const phoneContainerStyle = { width: phoneWidth, maxWidth: "100%" };
  const contentBgStyle =
    cartBackgroundUrl && cartBackgroundUrl.trim() !== ""
      ? { backgroundImage: `url(${cartBackgroundUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
      : { backgroundColor: "#1c1917" };

  return (
    <OrderSessionProvider
      slug={slug}
      token={token}
      expiresAt={session.expiresAt.toISOString()}
      label={session.label}
      initialCart={initialCart}
    >
      <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-stone-900" dir="rtl">
        <div
          className="rounded-[2.5rem] bg-black p-2 shadow-2xl"
          style={phoneContainerStyle}
        >
          <div
            className="relative overflow-hidden bg-black rounded-[2rem] flex flex-col"
            style={{ minHeight: "min(90vh, 700px)", maxHeight: "min(90vh, 700px)" }}
          >
            <div className="h-6 bg-black flex justify-center shrink-0">
              <div className="w-24 h-4 bg-stone-900 rounded-full" />
            </div>
            <div className="flex-1 min-h-0 relative flex flex-col">
              <div className="absolute inset-0 z-0" style={contentBgStyle} aria-hidden />
              <div className="relative z-10 flex flex-col flex-1 min-h-0 overflow-hidden">
                <header className="shrink-0 flex items-center gap-3 p-4 border-b border-white/10 bg-stone-900/80 backdrop-blur">
                  <Link
                    href={`/r/${slug}/order/${token}`}
                    className="flex items-center gap-2 py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm no-underline min-h-[44px]"
                    aria-label="חזרה לתפריט"
                  >
                    <span className="text-lg leading-none" aria-hidden>←</span>
                    <span>חזרה</span>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-base font-bold text-white truncate">{restaurant.name}</h1>
                    <p className="text-xs text-white/60">סיכום הזמנה</p>
                  </div>
                </header>
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide">
                  <OrderSummaryPage
                    priceColor={(restaurant as { priceColor?: string | null }).priceColor ?? undefined}
                    primaryColor={restaurant.primaryColor ?? "#1c1917"}
                    textColor={(restaurant as { textColor?: string | null }).textColor ?? "#fafaf9"}
                    descriptionColor={(restaurant as { descriptionColor?: string | null }).descriptionColor ?? "#a8a29e"}
                    cartColor={(restaurant as { cartColor?: string | null }).cartColor ?? restaurant.primaryColor ?? "#1c1917"}
                    cartTextColor={(restaurant as { cartTextColor?: string | null }).cartTextColor ?? "#ffffff"}
                    summaryCardColor={(restaurant as { summaryCardColor?: string | null }).summaryCardColor ?? undefined}
                    menuDishes={menuDishes.map((d) => ({
                      id: d.id,
                      title: d.title,
                      imageUrl: d.imageUrl,
                      description: d.description,
                      priceCents: d.priceCents,
                      paramCategories: (d as { paramCategories?: Array<{ id: number; name: string; sortOrder: number; minSelections: number; maxSelections: number; parameters: Array<{ id: number; name: string; sortOrder: number; priceCents: number }> }> }).paramCategories ?? [],
                    }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OrderSessionProvider>
  );
}
