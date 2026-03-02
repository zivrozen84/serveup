import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { RestaurantMenu } from "@/components/restaurant/RestaurantMenu";

export default async function RestaurantMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, isActive: true },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        include: { dishes: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  if (!restaurant) notFound();

  return (
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
        secondaryColor: restaurant.secondaryColor,
        textColor: restaurant.textColor,
        descriptionColor: restaurant.descriptionColor,
        priceColor: restaurant.priceColor,
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
        })),
      }))}
    />
  );
}
