"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Map, Link2 } from "lucide-react";
import { ReceptionMapView } from "@/components/admin/ReceptionMapView";

type Table = {
  id: number;
  tableNumber: number;
  label: string | null;
  positionX: number | null;
  positionY: number | null;
  shape: string | null;
};

interface MapViewClientProps {
  restaurantId: number;
  restaurantName: string;
  restaurantSlug: string;
  primaryColor: string;
  tables: Table[];
}

export function MapViewClient({
  restaurantId,
  restaurantName,
  restaurantSlug,
  primaryColor,
  tables,
}: MapViewClientProps) {
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [tableLink, setTableLink] = useState<string | null>(null);
  const [creatingLink, setCreatingLink] = useState(false);

  const selectedTable = selectedTableId != null
    ? tables.find((t) => t.id === selectedTableId)
    : null;

  async function handleCreateLink() {
    if (selectedTableId == null) return;
    setCreatingLink(true);
    setTableLink(null);
    try {
      const res = await fetch(`/api/r/${restaurantSlug}/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: selectedTableId }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        const url =
          typeof window !== "undefined"
            ? `${window.location.origin}/r/${restaurantSlug}/order/${data.token}`
            : "";
        setTableLink(url);
      }
    } finally {
      setCreatingLink(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Link
          href={`/admin/restaurants/${restaurantId}`}
          className="text-white/60 hover:text-white text-sm flex items-center gap-1"
        >
          <ArrowRight className="w-4 h-4" />
          חזרה לעריכת מסעדה
        </Link>
        <Link
          href={`/admin/restaurants/${restaurantId}/map`}
          className="text-sm text-white/70 hover:text-white flex items-center gap-1"
        >
          <Map className="w-4 h-4" />
          עריכת מפה
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-white">צפה במפה – {restaurantName}</h1>
      <p className="text-white/60 text-sm">לחץ על שולחן כדי ליצור לינק לטרמינל הזמנה (NFC / שיתוף)</p>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex-1 min-w-0">
          <ReceptionMapView
            tables={tables}
            primaryColor={primaryColor}
            selectedTableId={selectedTableId}
            onSelectTable={setSelectedTableId}
          />
        </div>

        {selectedTable && (
          <aside className="w-full lg:w-72 shrink-0 rounded-xl border border-white/10 bg-[#0e1118] p-4">
            <h3 className="font-semibold text-white mb-2">
              שולחן {selectedTable.label ?? selectedTable.tableNumber}
            </h3>
            <button
              type="button"
              onClick={handleCreateLink}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-sky-500/50 bg-sky-500/20 text-sky-300 text-sm font-medium hover:bg-sky-500/30 disabled:opacity-50"
            >
              <Link2 className="w-4 h-4" />
              {creatingLink ? "יוצר לינק..." : "צור לינק לשולחן"}
            </button>
            {tableLink && (
              <div className="mt-3 flex gap-2 items-center">
                <input
                  type="text"
                  readOnly
                  value={tableLink}
                  className="flex-1 min-w-0 rounded bg-black/30 px-2 py-1.5 text-white/90 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(tableLink)}
                  className="shrink-0 py-1.5 px-3 rounded bg-white/10 hover:bg-white/20 text-white text-xs"
                >
                  העתק
                </button>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
