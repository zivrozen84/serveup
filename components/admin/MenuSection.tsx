"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Dish {
  id: number;
  title: string;
  description: string | null;
  allergens: string | null;
  priceCents: number;
  imageUrl: string | null;
}

interface Category {
  id: number;
  name: string;
  dishes: Dish[];
}

export function MenuSection({
  restaurantId,
  categories: initialCategories,
}: {
  restaurantId: number;
  categories: Category[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [newCatName, setNewCatName] = useState("");
  const [newDish, setNewDish] = useState({ title: "", description: "", priceCents: 0, categoryId: 0 });

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const res = await fetch(`/api/admin/restaurants/${restaurantId}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName.trim(), sortOrder: categories.length }),
    });
    const data = await res.json();
    if (res.ok) {
      setCategories((p) => [...p, { ...data, dishes: [] }]);
      setNewCatName("");
    }
  }

  async function addDish(e: React.FormEvent, categoryId: number) {
    e.preventDefault();
    if (!newDish.title.trim()) return;
    const res = await fetch(`/api/admin/categories/${categoryId}/dishes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newDish.title.trim(),
        description: newDish.description || undefined,
        priceCents: Math.round((newDish.priceCents || 0) * 100),
        sortOrder: 0,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setCategories((p) =>
        p.map((c) => (c.id === categoryId ? { ...c, dishes: [...c.dishes, data] } : c))
      );
      setNewDish({ title: "", description: "", priceCents: 0, categoryId: 0 });
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">תפריט</h2>
      <form onSubmit={addCategory} className="flex gap-4 items-end p-4 rounded-lg bg-[#0e1118] border border-white/5 mb-6">
        <div className="flex-1">
          <label className="text-sm">קטגוריה חדשה</label>
          <Input
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="עיקריות"
          />
        </div>
        <Button type="submit" className="text-white hover:opacity-90" style={{ backgroundColor: "#37C27D" }}>הוסף קטגוריה</Button>
      </form>
      <div className="space-y-4">
        {categories.map((cat) => (
          <div key={cat.id} className="rounded-lg border border-white/5 bg-[#0e1118] overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors text-right"
              onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
            >
              <span className="font-semibold">{cat.name}</span>
              <span className="text-muted-foreground text-sm">{cat.dishes.length} מנות</span>
            </button>
            {expanded === cat.id && (
              <div className="border-t border-white/5 p-4 space-y-4">
                <form onSubmit={(e) => addDish(e, cat.id)} className="flex flex-wrap gap-4">
                  <Input
                    placeholder="שם מנה"
                    value={expanded === cat.id ? newDish.title : ""}
                    onChange={(e) => setNewDish((p) => ({ ...p, title: e.target.value }))}
                  />
                  <Input
                    placeholder="מחיר (למשל 45.50)"
                    type="number"
                    step="0.01"
                    value={expanded === cat.id ? newDish.priceCents || "" : ""}
                    onChange={(e) =>
                      setNewDish((p) => ({ ...p, priceCents: parseFloat(e.target.value) || 0 }))
                    }
                  />
                  <Button type="submit">הוסף מנה</Button>
                </form>
                <div className="space-y-2">
                  {cat.dishes.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#1A1D21] border border-white/5"
                    >
                      <div>
                        <p className="font-medium">{d.title}</p>
                        <p className="text-sm text-muted-foreground">₪{(d.priceCents / 100).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
