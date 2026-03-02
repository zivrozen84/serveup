"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Table {
  id: number;
  tableNumber: number;
  label?: string | null;
  capacity?: number;
  description: string | null;
  token: string;
}

export function TablesSection({ restaurantId, tables }: { restaurantId: number; tables: Table[] }) {
  const [list, setList] = useState(tables);
  const [newNum, setNewNum] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const num = parseInt(newNum);
    if (isNaN(num) || num < 1) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/restaurants/${restaurantId}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableNumber: num }),
      });
      const data = await res.json();
      if (res.ok) setList((p) => [...p, data]);
      setNewNum("");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(tableId: number) {
    const res = await fetch(`/api/admin/restaurants/${restaurantId}/tables/${tableId}`, {
      method: "DELETE",
    });
    if (res.ok) setList((p) => p.filter((t) => t.id !== tableId));
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-white">שולחנות</h2>
      <form onSubmit={handleAdd} className="flex gap-4 items-end p-4 rounded-lg bg-[#0e1118] border border-white/5 mb-4">
        <div>
          <label className="text-sm text-white">מספר שולחן</label>
          <Input
            type="number"
            min={1}
            value={newNum}
            onChange={(e) => setNewNum(e.target.value)}
            placeholder="1"
          />
        </div>
        <Button type="submit" disabled={loading} className="text-white hover:opacity-90" style={{ backgroundColor: "#37C27D" }}>הוסף</Button>
      </form>
      <div className="space-y-2">
        {list.map((t) => (
          <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-[#0e1118]">
            <div className="flex flex-col">
              <span className="font-medium text-white">
                {t.label ?? t.tableNumber} - {t.capacity ?? 0} מקומות
              </span>
            </div>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-[#1A1D21] px-2 py-1 rounded truncate max-w-[200px]">
                /r/{t.token}
              </code>
              <button
                type="button"
                onClick={() => handleDelete(t.id)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                הסר
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
