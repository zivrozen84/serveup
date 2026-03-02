"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical } from "lucide-react";

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

function DroppableSlot({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[12px] transition-colors rounded -mx-1 px-1 ${isOver ? "bg-[#37C27D]/40" : ""}`}
    >
      {children}
    </div>
  );
}

function DraggableDishRow({
  dish,
  isDragging,
  isEditing,
  editForm,
  onEditFormChange,
  onSave,
  onCancelEdit,
  onStartEdit,
}: {
  dish: Dish;
  isDragging: boolean;
  isEditing: boolean;
  editForm: { title: string; description: string; priceCents: number };
  onEditFormChange: (v: Partial<typeof editForm>) => void;
  onSave: (e: React.FormEvent) => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `dish-${dish.id}`,
    data: { dish },
  });

  if (isEditing) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-[#1A1D21] border border-white/5">
        <form onSubmit={onSave} className="flex-1 flex flex-col gap-2">
          <Input
            value={editForm.title}
            onChange={(e) => onEditFormChange({ title: e.target.value })}
            placeholder="שם מנה"
          />
          <Input
            value={editForm.description}
            onChange={(e) => onEditFormChange({ description: e.target.value })}
            placeholder="תיאור (אופציונלי)"
          />
          <Input
            type="number"
            step="0.01"
            value={editForm.priceCents || ""}
            onChange={(e) =>
              onEditFormChange({ priceCents: parseFloat(e.target.value) || 0 })
            }
            placeholder="מחיר"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="text-white" style={{ backgroundColor: "#37C27D" }}>
              שמור
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onCancelEdit}>
              ביטול
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex items-center justify-between p-3 rounded-lg bg-[#1A1D21] border border-white/5 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none p-1 -m-1 text-white/40 hover:text-white/70"
      >
        <GripVertical className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{dish.title}</p>
        {dish.description && (
          <p className="text-sm text-muted-foreground">{dish.description}</p>
        )}
        <p className="text-sm text-muted-foreground">₪{(dish.priceCents / 100).toFixed(2)}</p>
      </div>
      <button
        type="button"
        onClick={onStartEdit}
        className="text-[#37C27D] hover:text-[#4ade80] font-medium bg-transparent border-none cursor-pointer text-sm px-1"
      >
        ערוך
      </button>
    </div>
  );
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
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", priceCents: 0 });
  const [activeDish, setActiveDish] = useState<Dish | null>(null);
  const router = useRouter();

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDish(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId.startsWith("dish-") || !overId.startsWith("slot-")) return;

    const dishId = parseInt(activeId.replace("dish-", ""), 10);
    const parts = overId.split("-");
    const catIdStr = parts[1];
    const targetCategoryId = parseInt(catIdStr, 10);
    let targetIndex: number;
    if (parts[2] === "header") {
      const cat = categories.find((c) => c.id === targetCategoryId);
      targetIndex = cat?.dishes.length ?? 0;
    } else {
      targetIndex = parseInt(parts[2], 10);
    }
    if (isNaN(dishId) || isNaN(targetCategoryId) || isNaN(targetIndex)) return;

    const dish = categories.flatMap((c) => c.dishes).find((d) => d.id === dishId);
    if (!dish) return;
    const fromCat = categories.find((c) => c.dishes.some((d) => d.id === dishId));
    if (fromCat?.id === targetCategoryId) {
      const catDishes = categories.find((c) => c.id === targetCategoryId)?.dishes ?? [];
      const oldIndex = catDishes.findIndex((d) => d.id === dishId);
      if (oldIndex === targetIndex || oldIndex === targetIndex - 1) return;
    }

    setCategories((prev) => {
      const fromCategory = prev.find((c) => c.dishes.some((d) => d.id === dishId));
      if (!fromCategory) return prev;
      const targetCat = prev.find((c) => c.id === targetCategoryId);
      if (!targetCat) return prev;

      if (fromCategory.id === targetCategoryId) {
        const list = [...fromCategory.dishes];
        const oldIndex = list.findIndex((d) => d.id === dishId);
        const [removed] = list.splice(oldIndex, 1);
        list.splice(targetIndex, 0, removed);
        return prev.map((c) =>
          c.id === targetCategoryId ? { ...c, dishes: list } : c
        );
      }

      const newFromDishes = fromCategory.dishes.filter((d) => d.id !== dishId);
      const newToDishes = [...targetCat.dishes];
      newToDishes.splice(targetIndex, 0, dish);
      return prev.map((c) => {
        if (c.id === fromCategory.id) return { ...c, dishes: newFromDishes };
        if (c.id === targetCategoryId) return { ...c, dishes: newToDishes };
        return c;
      });
    });

    fetch(`/api/admin/dishes/${dishId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetCategoryId, targetIndex }),
    }).then(() => router.refresh());
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    if (!id.startsWith("dish-")) return;
    const dishId = parseInt(id.replace("dish-", ""), 10);
    const dish = categories.flatMap((c) => c.dishes).find((d) => d.id === dishId);
    if (dish) setActiveDish(dish);
  }

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

  function startEditDish(d: Dish) {
    setEditingDish(d);
    setEditForm({
      title: d.title,
      description: d.description ?? "",
      priceCents: d.priceCents / 100,
    });
  }

  async function saveDish(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDish) return;
    const res = await fetch(`/api/admin/dishes/${editingDish.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editForm.title.trim(),
        description: editForm.description || null,
        priceCents: Math.round((editForm.priceCents || 0) * 100),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setEditingDish(null);
      router.refresh();
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
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-4">
          {categories.map((cat) => (
            <div key={cat.id} className="rounded-lg border border-white/5 bg-[#0e1118] overflow-hidden">
              <DroppableSlot id={`slot-${cat.id}-header`}>
                <button
                  type="button"
                  className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors text-right"
                  onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
                >
                  <span className="font-semibold">{cat.name}</span>
                  <span className="text-muted-foreground text-sm">{cat.dishes.length} מנות</span>
                </button>
              </DroppableSlot>
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
                  <div className="space-y-1">
                    {cat.dishes.map((d, index) => (
                      <div key={d.id} className="space-y-1">
                        <DroppableSlot id={`slot-${cat.id}-${index}`}>
                          <div className="h-2" />
                        </DroppableSlot>
                        <DraggableDishRow
                          dish={d}
                          isDragging={activeDish?.id === d.id}
                          isEditing={editingDish?.id === d.id}
                          editForm={editForm}
                          onEditFormChange={setEditForm}
                          onSave={saveDish}
                          onCancelEdit={() => setEditingDish(null)}
                          onStartEdit={() => startEditDish(d)}
                        />
                      </div>
                    ))}
                    <DroppableSlot id={`slot-${cat.id}-${cat.dishes.length}`}>
                      <div className="h-6" />
                    </DroppableSlot>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <DragOverlay>
          {activeDish ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#1A1D21] border-2 border-[#37C27D] shadow-xl opacity-95">
              <GripVertical className="w-5 h-5 text-white/40" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{activeDish.title}</p>
                <p className="text-sm text-muted-foreground">₪{(activeDish.priceCents / 100).toFixed(2)}</p>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
