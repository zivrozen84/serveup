"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function OrderEntryPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const res = await fetch(`/api/r/${slug}/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (!res.ok) {
          const isTableUnavailable = res.status === 403 && (data?.error === "table_unavailable" || data?.message === "השולחן לא פעיל כרגע");
          const msg = res.status === 403 && data?.message ? data.message : (data?.error || "שגיאה ביצירת טרמינל");
          setError(isTableUnavailable ? "table_unavailable" : msg);
          return;
        }
        if (data.token) {
          router.replace(`/r/${slug}/order/${data.token}`);
          return;
        }
        setError("לא התקבל טוקן");
      } catch {
        setError("שגיאת רשת");
      }
    })();
  }, [slug, router]);

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-stone-900">
        {error === "table_unavailable" ? (
          <div className="rounded-[2.5rem] bg-black p-2 shadow-2xl" style={{ width: 420, maxWidth: "100%" }}>
            <div
              className="relative overflow-hidden rounded-[2rem] flex flex-col bg-[#0a1628]"
              style={{ minHeight: "min(90vh, 700px)", maxHeight: "min(90vh, 700px)" }}
            >
              <div className="h-6 bg-black flex justify-center shrink-0">
                <div className="w-24 h-4 bg-stone-900 rounded-full" />
              </div>
              <div className="flex-1 flex items-center justify-center p-6 text-white">
                <p className="text-center text-white/95 text-2xl md:text-3xl font-light tracking-wide">השולחן לא פעיל כרגע</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-white font-bold">{error}</p>
        )}
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-stone-900 text-white">
      <p className="text-center">פותח טרמינל...</p>
    </div>
  );
}
