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
          setError(data?.error || "שגיאה ביצירת טרמינל");
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-stone-900 text-white">
        <p className="text-center">{error}</p>
      </div>
    );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-stone-900 text-white">
      <p className="text-center">פותח טרמינל...</p>
    </div>
  );
}
