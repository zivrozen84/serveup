import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MapViewClient } from "./MapViewClient";

export default async function MapViewPage({
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
    select: { id: true, name: true, slug: true, primaryColor: true },
  });
  if (!restaurant) notFound();

  const tables = await prisma.table.findMany({
    where: { restaurantId: id },
    orderBy: { tableNumber: "asc" },
    select: {
      id: true,
      tableNumber: true,
      label: true,
      positionX: true,
      positionY: true,
      shape: true,
    },
  });

  return (
    <MapViewClient
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      restaurantSlug={restaurant.slug}
      primaryColor={restaurant.primaryColor}
      tables={tables}
    />
  );
}
