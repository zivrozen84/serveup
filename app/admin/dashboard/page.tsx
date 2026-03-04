import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { RestaurantEditChoiceDialog } from "@/components/admin/RestaurantEditChoiceDialog";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");

  const [restaurants, activeTerminalsCount] = await Promise.all([
    prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { _count: { select: { tables: true } } },
    }),
    prisma.orderSession.count({
      where: { status: "active", expiresAt: { gt: new Date() } },
    }),
  ]);

  const activeRestaurants = restaurants.filter((r) => r.isActive).length;

  const cards = [
    { title: "מסעדות פעילות", value: activeRestaurants, accent: "#37C27D", badge: "red", bars: [2, 4, 6, 4, 7, 5, 3] },
    { title: "הזמנות היום", value: "0", accent: "#4A90E2", badge: null, bars: [1, 3, 2, 5, 2, 4, 6] },
    { title: "הכנסות היום", value: "₪0", accent: "#F5A623", badge: null, bars: [5, 3, 7, 4, 6, 2, 5] },
    { title: "טרמינלים פעילים", value: activeTerminalsCount, accent: "#D0021B", badge: "green", bars: [3, 6, 4, 2, 5, 7, 4] },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8 text-white">סקירת מערכת כללית</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border border-white/5 bg-[#0e1118] p-5 relative min-h-[140px] flex flex-col"
          >
            <p className="text-sm font-medium text-white/60 mb-3">{card.title}</p>
            <p className="text-3xl font-bold flex-1 flex items-center mb-14" style={{ color: card.accent }}>
              {card.value}
            </p>
            {card.badge === "red" && (
              <span className="absolute bottom-4 left-4 w-2.5 h-2.5 rounded-full bg-[#D0021B]" />
            )}
            {card.badge === "green" && (
              <span className="absolute bottom-4 left-4 w-2.5 h-2.5 rounded-full bg-[#37C27D]" />
            )}
            <div className="absolute bottom-4 right-4 flex gap-0.5 h-10 items-end">
              {card.bars.map((h, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-sm opacity-80"
                  style={{ height: `${h * 5}px`, backgroundColor: card.accent }}
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
                      <RestaurantEditChoiceDialog
                        restaurantId={r.id}
                        restaurantName={r.name}
                      >
                        <button
                          type="button"
                          className="text-sm hover:opacity-80 cursor-pointer"
                          style={{ color: "#37C27D" }}
                        >
                          ערוך
                        </button>
                      </RestaurantEditChoiceDialog>
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
