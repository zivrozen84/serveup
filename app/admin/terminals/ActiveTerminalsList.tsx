"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SessionDto = {
  id: number;
  token: string;
  label: string | null;
  tableId: number | null;
  table: { id: number; label: string | null; tableNumber: number } | null;
  status: string;
  createdAt: string;
  expiresAt: string;
  cartItemsCount: number;
  minutesLeft: number;
};

export function ActiveTerminalsList({
  restaurants,
}: {
  restaurants: Array<{ id: number; name: string; slug: string }>;
}) {
  const [sessionsByRestaurant, setSessionsByRestaurant] = useState<
    Record<number, SessionDto[]>
  >({});
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    const out: Record<number, SessionDto[]> = {};
    await Promise.all(
      restaurants.map(async (r) => {
        try {
          const res = await fetch(
            `/api/admin/restaurants/${r.id}/sessions?active=true`,
            { credentials: "include" }
          );
          if (res.ok) {
            const data = await res.json();
            out[r.id] = data;
          } else {
            out[r.id] = [];
          }
        } catch {
          out[r.id] = [];
        }
      })
    );
    setSessionsByRestaurant(out);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeSession = async (restaurantId: number, sessionId: number) => {
    if (!confirm("לסגור את הטרמינל? העגלה תישאר אך לא יהיה ניתן להוסיף פריטים."))
      return;
    try {
      const res = await fetch(
        `/api/admin/restaurants/${restaurantId}/sessions/${sessionId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "close" }),
        }
      );
      if (res.ok) await fetchAll();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return <p className="text-white/60">טוען...</p>;
  }

  const totalActive = Object.values(sessionsByRestaurant).reduce(
    (sum, arr) => sum + arr.length,
    0
  );
  if (totalActive === 0) {
    return (
      <p className="text-white/60 py-8">
        אין טרמינלים פעילים כרגע. פתיחת לינק <strong>/r/[slug]/order</strong> יוצרת סשן חדש.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {restaurants.map((r) => {
        const sessions = sessionsByRestaurant[r.id] ?? [];
        if (sessions.length === 0) return null;
        return (
          <div key={r.id} className="rounded-xl bg-white/5 border border-white/10 p-4">
            <h2 className="text-lg font-semibold text-white mb-3">{r.name}</h2>
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center gap-3 py-2 px-3 rounded-lg bg-white/5"
                >
                  <span className="text-white font-medium">
                    {s.label || s.table?.label || `שולחן ${s.table?.tableNumber ?? "—"}` || "טרמינל"}
                  </span>
                  <span className="text-white/60 text-sm">
                    {s.minutesLeft} דק׳ נותרו • {s.cartItemsCount} פריטים
                  </span>
                  <Link
                    href={`/r/${r.slug}/order/${s.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#2F7C73] hover:underline"
                  >
                    פתח לינק
                  </Link>
                  <button
                    type="button"
                    onClick={() => closeSession(r.id, s.id)}
                    className="text-sm px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300"
                  >
                    סגור
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
