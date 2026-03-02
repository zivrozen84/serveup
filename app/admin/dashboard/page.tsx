import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const restaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { _count: { select: { tables: true } } },
  });

  const activeRestaurants = restaurants.filter((r) => r.isActive).length;
  const totalTables = restaurants.reduce((s, r) => s + r._count.tables, 0);

  const cards = [
    { title: "מסעדות פעילות", value: activeRestaurants, accent: "#37C27D", badge: "red" },
    { title: "הזמנות היום", value: "0", accent: "#4A90E2", badge: null },
    { title: "הכנסות היום", value: "₪0", accent: "#F5A623", badge: null },
    { title: "שולחנות פעילים", value: totalTables, accent: "#D0021B", badge: "green" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 text-white">סקירת מערכת כללית</h1>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mb-6">
        {cards.map((card) => (
          <div key={card.title} className="rounded-lg border border-white/5 bg-[#0e1118] p-3 relative min-h-[120px]">
            <div>
              <p className="text-xl font-bold" style={{ color: card.accent }}>{card.title}</p>
              <p className="text-2xl font-bold mt-1" style={{ color: card.accent }}>{card.value}</p>
            </div>
            {card.badge === "red" && (
              <span className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-[#D0021B] text-[8px] font-bold text-white flex items-center justify-center">0</span>
            )}
            {card.badge === "green" && (
              <span className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-[#37C27D] text-[8px] font-bold text-white flex items-center justify-center">0</span>
            )}
            <div className="absolute bottom-2 right-2 flex gap-1 h-8 items-end">
              {[2, 4, 2, 5, 7, 5, 1].map((h, i) => (
                <div
                  key={i}
                  className="w-2 rounded-sm"
                  style={{ height: `${h * 4}px`, backgroundColor: card.accent }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-white/5 bg-[#0e1118] p-6 flex flex-col">
        <h2 className="text-lg font-semibold text-white mb-4">מסעדות אחרונות</h2>
        {restaurants.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <p className="text-white/70 mb-2">אין עדיין מסעדות</p>
            <Link href="/admin/restaurants/new" className="font-medium hover:opacity-80" style={{ color: "#37C27D" }}>
              הוסף מסעדה
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-right text-sm text-muted-foreground">
                  <th className="p-3">שם</th>
                  <th className="p-3">עיר</th>
                  <th className="p-3">סטטוס</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {restaurants.map((r) => (
                  <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3">{r.city}</td>
                    <td className="p-3">
                      <span className={r.isActive ? "" : "text-white/60"} style={r.isActive ? { color: "#37C27D" } : undefined}>
                        {r.isActive ? "פעיל" : "לא פעיל"}
                      </span>
                    </td>
                    <td className="p-3">
                      <Link href={`/admin/restaurants/${r.id}`} className="text-sm hover:opacity-80" style={{ color: "#37C27D" }}>
                        ערוך
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-end mt-4 pt-4 border-t border-white/5">
          <Link href="/admin/restaurants" className="text-sm hover:opacity-80" style={{ color: "#37C27D" }}>
            הצג הכל
          </Link>
        </div>
      </div>
    </div>
  );
}
