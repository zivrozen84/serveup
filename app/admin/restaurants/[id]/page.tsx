import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RestaurantForm } from "@/components/admin/RestaurantForm";
import Link from "next/link";
import { MenuSection } from "@/components/admin/MenuSection";
import { TablesSection } from "@/components/admin/TablesSection";
import { RestaurantMenu } from "@/components/restaurant/RestaurantMenu";

export default async function RestaurantEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const { id: idParam } = await params;
  const id = parseInt(idParam);
  if (isNaN(id)) notFound();

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: {
      categories: { include: { dishes: true }, orderBy: { sortOrder: "asc" } },
      tables: true,
    },
  });
  if (!restaurant) notFound();

  const menuProps = {
    restaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      logoUrl: restaurant.logoUrl,
      bannerUrl: restaurant.bannerUrl,
      backgroundUrl: restaurant.backgroundUrl,
      primaryColor: restaurant.primaryColor,
    },
    categories: restaurant.categories.map((c) => ({
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
    })),
  };

  return (
    <div className="flex gap-8 flex-col lg:flex-row">
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-6">
          <Link href="/admin/restaurants" className="text-white/70 hover:text-white text-sm">
            ← חזרה למסעדות
          </Link>
          <a
            href={`/r/${restaurant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm hover:opacity-80"
            style={{ color: "#37C27D" }}
          >
            צפה בתפריט
          </a>
        </div>
        <h1 className="text-2xl font-bold mb-6 text-white">עריכת {restaurant.name}</h1>
        <RestaurantForm
          initialData={{
            id: restaurant.id,
            name: restaurant.name,
            slug: restaurant.slug,
            ownerName: restaurant.ownerName,
            ownerEmail: restaurant.ownerEmail,
            ownerPhone: restaurant.ownerPhone,
            city: restaurant.city,
            primaryColor: restaurant.primaryColor,
            isActive: restaurant.isActive,
      logoUrl: restaurant.logoUrl,
      bannerUrl: restaurant.bannerUrl,
      backgroundUrl: restaurant.backgroundUrl,
          }}
        />
        <div className="mt-12">
          <TablesSection restaurantId={restaurant.id} tables={restaurant.tables} />
        </div>
        <div className="mt-12">
          <MenuSection restaurantId={restaurant.id} categories={restaurant.categories} />
        </div>
      </div>
      <div className="lg:w-[440px] shrink-0 sticky top-6">
        <h2 className="text-lg font-semibold mb-4 text-white">תצוגה מקדימה (Preview)</h2>
        <RestaurantMenu {...menuProps} forcePreview />
      </div>
    </div>
  );
}
