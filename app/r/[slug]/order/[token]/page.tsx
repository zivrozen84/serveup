import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RestaurantMenu } from "@/components/restaurant/RestaurantMenu";
import { OrderSessionProvider } from "@/components/restaurant/OrderSessionContext";

export default async function OrderTerminalPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, isActive: true },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        include: {
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
  });
  if (!restaurant) notFound();

  const session = await prisma.orderSession.findFirst({
    where: { restaurantId: restaurant.id, token },
  });

  if (!session) notFound();
  if (session.status !== "active") notFound();
  if (new Date() > session.expiresAt) notFound();

  if (session.tableId) {
    const table = await prisma.table.findUnique({
      where: { id: session.tableId },
      select: { isOffline: true },
    });
    if (table?.isOffline) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-stone-900">
          <div className="rounded-[2.5rem] bg-black p-2 shadow-2xl" style={{ width: 420, maxWidth: "100%" }}>
            <div
              className="relative overflow-hidden rounded-[2rem] flex flex-col bg-[#0a1628]"
              style={{ minHeight: "min(90vh, 700px)", maxHeight: "min(90vh, 700px)" }}
            >
              <div className="h-6 bg-black flex justify-center shrink-0">
                <div className="w-24 h-4 bg-stone-900 rounded-full" />
              </div>
              <div className="flex-1 flex items-center justify-center p-6 text-white">
                <p className="text-center text-white/95 text-2xl md:text-3xl font-light tracking-wide">השולחן לא פעיל כרגע</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <OrderSessionProvider
      slug={slug}
      token={token}
      expiresAt={session.expiresAt.toISOString()}
      label={session.label}
      initialCart={[]}
      initialOrderedItems={[]}
    >
      <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-stone-900">
        <RestaurantMenu
          restaurant={{
            id: restaurant.id,
            name: restaurant.name,
            slug: restaurant.slug,
            logoUrl: restaurant.logoUrl,
            bannerUrl: restaurant.bannerUrl,
            backgroundUrl: restaurant.backgroundUrl,
            frameUrl: restaurant.frameUrl,
            primaryColor: restaurant.primaryColor,
            categoryTextColor: (restaurant as { categoryTextColor?: string | null }).categoryTextColor ?? null,
            categoryBubbleSecondaryColor: (restaurant as { categoryBubbleSecondaryColor?: string | null }).categoryBubbleSecondaryColor ?? null,
            secondaryColor: restaurant.secondaryColor,
            textColor: restaurant.textColor,
            descriptionColor: restaurant.descriptionColor,
            priceColor: restaurant.priceColor,
            cartColor: (restaurant as { cartColor?: string | null }).cartColor ?? restaurant.primaryColor,
            cartTextColor: (restaurant as { cartTextColor?: string | null }).cartTextColor ?? "#ffffff",
            cartBackgroundUrl: (restaurant as { cartBackgroundUrl?: string | null }).cartBackgroundUrl ?? null,
            cartBarOverlayOpacity: (restaurant as { cartBarOverlayOpacity?: number | null }).cartBarOverlayOpacity ?? null,
            cartBarControlsOpacity: (restaurant as { cartBarControlsOpacity?: number | null }).cartBarControlsOpacity ?? null,
            expansionBackdropOpacity: (restaurant as { expansionBackdropOpacity?: number | null }).expansionBackdropOpacity ?? null,
            flyingDiscVisibility: (restaurant as { flyingDiscVisibility?: number | null }).flyingDiscVisibility ?? null,
            bottomNavColor: (restaurant as { bottomNavColor?: string | null }).bottomNavColor ?? null,
            bottomNavIconColor: (restaurant as { bottomNavIconColor?: string | null }).bottomNavIconColor ?? null,
            menuDisplayFormat: restaurant.menuDisplayFormat ?? "large",
            textSize: (restaurant as { textSize?: number }).textSize ?? 16,
            fontFamily: (restaurant as { fontFamily?: string | null }).fontFamily ?? null,
          }}
          categories={restaurant.categories.map((c) => ({
            id: c.id,
            name: c.name,
            dishes: c.dishes.map((d) => ({
              id: d.id,
              title: d.title,
              imageUrl: d.imageUrl,
              description: d.description,
              allergens: d.allergens,
              priceCents: d.priceCents,
              paramCategories: (d as { paramCategories: Array<{ id: number; name: string; sortOrder: number; minSelections: number; maxSelections: number; parameters: Array<{ id: number; name: string; sortOrder: number; priceCents: number }> }> }).paramCategories ?? [],
            })),
          }))}
          phoneLayout
          orderSessionToken={token}
          orderSlug={slug}
        />
      </div>
    </OrderSessionProvider>
  );
}
