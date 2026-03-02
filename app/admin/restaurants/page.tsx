import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function RestaurantsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const restaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">מסעדות</h1>
        <Link
          href="/admin/restaurants/new"
          className="rounded-lg px-4 py-2 font-medium hover:opacity-90 text-white"
          style={{ backgroundColor: "#37C27D" }}
        >
          + מסעדה חדשה
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {restaurants.map((r) => (
          <Link
            key={r.id}
            href={`/admin/restaurants/${r.id}`}
            className="rounded-xl border border-white/5 bg-[#0e1118] p-4 hover:border-[#37C27D]/50 transition-colors flex items-center gap-4"
          >
            <div
              className="h-12 w-12 rounded-lg shrink-0 flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: r.primaryColor }}
            >
              {r.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate text-white">{r.name}</p>
              <p className="text-sm text-white/60">{r.city}</p>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded ${
                r.isActive ? "bg-[#37C27D]/20 text-[#37C27D]" : "bg-white/10 text-white/60"
              }`}
            >
              {r.isActive ? "פעיל" : "לא פעיל"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
