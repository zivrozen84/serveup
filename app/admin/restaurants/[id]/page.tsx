import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RestaurantEditWithPreview } from "@/components/admin/RestaurantEditWithPreview";
import Link from "next/link";

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
      frameUrl: restaurant.frameUrl,
      primaryColor: restaurant.primaryColor,
      secondaryColor: restaurant.secondaryColor,
      textColor: restaurant.textColor,
      descriptionColor: restaurant.descriptionColor,
      priceColor: restaurant.priceColor,
      menuDisplayFormat: restaurant.menuDisplayFormat ?? "large",
      textSize: (restaurant as { textSize?: number }).textSize ?? 16,
      fontFamily: (restaurant as { fontFamily?: string | null }).fontFamily ?? null,
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

  const formInitialData = {
    id: restaurant.id,
    name: restaurant.name,
    slug: restaurant.slug,
    ownerName: restaurant.ownerName,
    ownerEmail: restaurant.ownerEmail,
    ownerPhone: restaurant.ownerPhone,
    city: restaurant.city,
    primaryColor: restaurant.primaryColor,
    secondaryColor: restaurant.secondaryColor,
    textColor: restaurant.textColor,
    descriptionColor: restaurant.descriptionColor,
    priceColor: restaurant.priceColor,
    menuDisplayFormat: restaurant.menuDisplayFormat ?? "large",
    isActive: restaurant.isActive,
    logoUrl: restaurant.logoUrl,
    bannerUrl: restaurant.bannerUrl,
    backgroundUrl: restaurant.backgroundUrl,
    frameUrl: restaurant.frameUrl,
    frameVariants: restaurant.frameVariants,
    textSize: (restaurant as { textSize?: number }).textSize ?? 16,
    fontFamily: (restaurant as { fontFamily?: string | null }).fontFamily ?? null,
  };

  return (
    <>
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
      <RestaurantEditWithPreview
        menuProps={menuProps}
        formInitialData={formInitialData}
        tables={restaurant.tables}
      />
    </>
  );
}
