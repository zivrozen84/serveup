import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ActiveTerminalsList } from "./ActiveTerminalsList";

export default async function TerminalsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const restaurants = await prisma.restaurant.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">טרמינלים פעילים</h1>
      <p className="text-white/70 mb-6">
        סשנים פתוחים (לינק טרמינל) – ניתן להאריך זמן או לסגור.
      </p>
      <ActiveTerminalsList restaurants={restaurants} />
    </div>
  );
}
