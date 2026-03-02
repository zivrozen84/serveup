import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RestaurantMapEditor } from "@/components/admin/RestaurantMapEditor";

export default async function RestaurantMapPage({
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
  });
  if (!restaurant) notFound();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/admin/restaurants/${id}`}
          className="text-white/60 hover:text-white text-sm flex items-center gap-1"
        >
          <ArrowRight className="w-4 h-4" />
          חזור לעריכת מסעדה
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-white mb-6">מפת מסעדה – {restaurant.name}</h1>

      <RestaurantMapEditor
        restaurantId={restaurant.id}
        restaurantName={restaurant.name}
        primaryColor={restaurant.primaryColor}
      />
    </div>
  );
}
