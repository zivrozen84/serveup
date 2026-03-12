import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReceptionCabalaClient } from "./ReceptionCabalaClient";

export default async function ReceptionPage({
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
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      receptionDontNotifyReady: true,
      receptionAutoDeleteMinutes: true,
      receptionAlertAfterMinutes: true,
      receptionWaiterPopupDisabled: true,
    },
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
    <ReceptionCabalaClient
      restaurantId={restaurant.id}
      restaurantName={restaurant.name}
      primaryColor={restaurant.primaryColor}
      tables={tables}
      initialDontNotify={restaurant.receptionDontNotifyReady ?? false}
      initialAutoDeleteMinutes={restaurant.receptionAutoDeleteMinutes ?? 30}
      initialAlertAfterMinutes={restaurant.receptionAlertAfterMinutes ?? null}
      initialWaiterPopupDisabled={restaurant.receptionWaiterPopupDisabled ?? false}
    />
  );
}
