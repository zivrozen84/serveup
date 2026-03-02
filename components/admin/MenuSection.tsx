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
  closestCenter,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, Trash2 } from "lucide-react";

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

function SortableCategoryBlock({
  cat,
  expanded,
  setExpanded,
  deleteCategory,
  isDragging,
  renderDishes,
}: {
  cat: Category;
  expanded: number | null;
  setExpanded: (id: number | null) => void;
  deleteCategory: (id: number) => void;
  isDragging: boolean;
  renderDishes: (catId: number) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: `category-${cat.id}`,
    data: { category: cat },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-white/5 bg-[#0e1118] overflow-hidden ${isDragging || isSortableDragging ? "opacity-50 z-10" : ""}`}
    >
      <DroppableSlot id={`slot-${cat.id}-header`}>
        <div className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors text-right">
          <div className="flex items-center gap-1 shrink-0">
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing touch-none p-1.5 rounded text-white/40 hover:text-white/70 hover:bg-white/5"
              title="גרור לשינוי סדר"
            >
              <GripVertical className="w-5 h-5" />
            </div>
            <button
              type="button"
              onClick={() => deleteCategory(cat.id)}
              className="p-1.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              title="הסר קטגוריה"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            className="flex-1 flex items-center justify-between cursor-pointer text-right min-w-0"
            onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
          >
            <span className="font-semibold">{cat.name}</span>
            <span className="text-muted-foreground text-sm shrink-0 mr-2">{cat.dishes.length} מנות</span>
          </button>
        </div>
      </DroppableSlot>
      {expanded === cat.id && (
        <div className="border-t border-white/5 p-4 space-y-4">
          {renderDishes(cat.id)}
        </div>
      )}
    </div>
  );
}

function DraggableDishRow({
  dish,
  isDragging,
  isEditing,
  editForm,
  saveError,
  onEditFormChange,
  onSave,
  onCancelEdit,
  onDismissError,
  onStartEdit,
  onDelete,
}: {
  dish: Dish;
  isDragging: boolean;
  isEditing: boolean;
  editForm: { title: string; description: string; priceCents: number; imageUrl: string };
  saveError?: string | null;
  onEditFormChange: (v: Partial<typeof editForm>) => void;
  onSave: (e: React.FormEvent) => void;
  onCancelEdit: () => void;
  onDismissError?: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
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
          <div>
            <label className="text-xs text-white/60 block mb-1">קישור תמונה</label>
            <Input
              value={editForm.imageUrl}
              onChange={(e) => onEditFormChange({ imageUrl: e.target.value })}
              placeholder="https://..."
            />
            {editForm.imageUrl && (
              <div className="mt-1 flex items-center gap-2">
                <img
                  src={editForm.imageUrl}
                  alt="תצוגה מקדימה"
                  className="w-12 h-12 rounded object-cover border border-white/10"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span className="text-xs text-white/50 truncate max-w-[200px]">{editForm.imageUrl}</span>
              </div>
            )}
          </div>
          <Input
            type="number"
            step="0.01"
            value={editForm.priceCents || ""}
            onChange={(e) =>
              onEditFormChange({ priceCents: parseFloat(e.target.value) || 0 })
            }
            placeholder="מחיר"
          />
          {saveError && (
            <div className="flex items-center justify-between gap-2 p-2 rounded bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400 flex-1">{saveError}</p>
              <button
                type="button"
                onClick={() => (onDismissError ?? onCancelEdit)()}
                className="text-red-400 hover:text-red-300 text-sm shrink-0"
                aria-label="סגור"
              >
                ✕
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="text-white" style={{ backgroundColor: "#37C27D" }}>
              שמור
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onCancelEdit}
              className="bg-[#1A1D21] text-white border border-white/10 hover:bg-[#252830]"
            >
              ביטול
            </Button>
            <button
              type="button"
              onClick={onDelete}
              className="text-red-400 hover:text-red-300 text-sm px-2"
            >
              הסר
            </button>
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
  const [newDish, setNewDish] = useState({ title: "", description: "", priceCents: 0, categoryId: 0, imageUrl: "" });
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", priceCents: 0, imageUrl: "" });
  const [dishSaveError, setDishSaveError] = useState<string | null>(null);
  const [activeDish, setActiveDish] = useState<Dish | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
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
    setActiveCategory(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith("category-") && overId.startsWith("category-")) {
      const oldIndex = categories.findIndex((c) => `category-${c.id}` === activeId);
      const newIndex = categories.findIndex((c) => `category-${c.id}` === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const newOrder = arrayMove(categories, oldIndex, newIndex);
      setCategories(newOrder);

      const res = await fetch(`/api/admin/restaurants/${restaurantId}/categories/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds: newOrder.map((c) => c.id) }),
      });
      if (res.ok) router.refresh();
      return;
    }

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
    if (id.startsWith("category-")) {
      const categoryId = parseInt(id.replace("category-", ""), 10);
      const cat = categories.find((c) => c.id === categoryId);
      if (cat) setActiveCategory(cat);
      return;
    }
    if (id.startsWith("dish-")) {
      const dishId = parseInt(id.replace("dish-", ""), 10);
      const dish = categories.flatMap((c) => c.dishes).find((d) => d.id === dishId);
      if (dish) setActiveDish(dish);
    }
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
        imageUrl: newDish.imageUrl?.trim() || undefined,
        priceCents: Math.round((newDish.priceCents || 0) * 100),
        sortOrder: 0,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setCategories((p) =>
        p.map((c) => (c.id === categoryId ? { ...c, dishes: [...c.dishes, data] } : c))
      );
      setNewDish({ title: "", description: "", priceCents: 0, categoryId: 0, imageUrl: "" });
    }
  }

  function startEditDish(d: Dish) {
    setEditingDish(d);
    setEditForm({
      title: d.title,
      description: d.description ?? "",
      priceCents: d.priceCents / 100,
      imageUrl: d.imageUrl ?? "",
    });
  }

  async function saveDish(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDish) return;
    setDishSaveError(null);
    const title = (editForm.title.trim() || editingDish.title).trim();
    if (!title) {
      setDishSaveError("שם מנה חובה");
      return;
    }
    const priceVal = Number(editForm.priceCents);
    const priceCents = isNaN(priceVal) || priceVal < 0 ? editingDish.priceCents : Math.round(priceVal * 100);
    const payload = {
      title,
      description: editForm.description?.trim() || null,
      imageUrl: editForm.imageUrl?.trim() || null,
      priceCents,
    };
    try {
      const res = await fetch(`/api/admin/dishes/${editingDish.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setCategories((p) =>
          p.map((c) => ({
            ...c,
            dishes: c.dishes.map((d) =>
              d.id === editingDish.id ? { ...d, ...data } : d
            ),
          }))
        );
        setEditingDish(null);
        setDishSaveError(null);
        router.refresh();
      } else {
        const err = data?.error;
        let msg = "שגיאה בשמירה";
        if (typeof err === "string") msg = err;
        else if (err?.formErrors?.length) msg = err.formErrors[0];
        else if (err?.fieldErrors) {
          const first = Object.values(err.fieldErrors).flat().find(Boolean);
          if (first) msg = String(first);
        } else if (data?.message) msg = data.message;
        setDishSaveError(msg);
      }
    } catch {
      setDishSaveError("שגיאת רשת");
    }
  }

  async function deleteDish(dishId: number) {
    const res = await fetch(`/api/admin/dishes/${dishId}`, { method: "DELETE" });
    if (res.ok) {
      setCategories((p) =>
        p.map((c) => ({ ...c, dishes: c.dishes.filter((d) => d.id !== dishId) }))
      );
      if (editingDish?.id === dishId) setEditingDish(null);
      router.refresh();
    }
  }

  async function deleteCategory(categoryId: number) {
    if (!confirm("להסיר את הקטגוריה? כל המנות שבה יימחקו.")) return;
    const res = await fetch(`/api/admin/categories/${categoryId}`, { method: "DELETE" });
    if (res.ok) {
      setCategories((p) => p.filter((c) => c.id !== categoryId));
      if (expanded === categoryId) setExpanded(null);
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
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={categories.map((c) => `category-${c.id}`)}
          strategy={verticalListSortingStrategy}
        >
        <div className="space-y-1">
          {categories.map((cat) => (
            <div key={cat.id} className="space-y-1">
              <SortableCategoryBlock
                cat={cat}
                expanded={expanded}
                setExpanded={setExpanded}
                deleteCategory={deleteCategory}
                isDragging={activeCategory?.id === cat.id}
                renderDishes={(catId) => {
                  const c = categories.find((x) => x.id === catId);
                  if (!c || expanded !== catId) return null;
                  return (
                    <>
                      <form onSubmit={(e) => addDish(e, catId)} className="flex flex-col gap-4">
                        <div className="flex flex-wrap gap-4 items-end">
                          <div className="flex-1 min-w-[200px]">
                            <label className="text-xs text-white/60 block mb-1">שם מנה</label>
                            <Input
                              placeholder="שם מנה"
                              value={newDish.title}
                              onChange={(e) => setNewDish((p) => ({ ...p, title: e.target.value }))}
                            />
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <label className="text-xs text-white/60 block mb-1">תיאור (נשמר לשימוש עתידי)</label>
                            <Input
                              placeholder="תיאור (אופציונלי)"
                              value={newDish.description}
                              onChange={(e) => setNewDish((p) => ({ ...p, description: e.target.value }))}
                            />
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <label className="text-xs text-white/60 block mb-1">קישור תמונה</label>
                            <Input
                              placeholder="https://..."
                              value={newDish.imageUrl}
                              onChange={(e) => setNewDish((p) => ({ ...p, imageUrl: e.target.value }))}
                            />
                          </div>
                          <div className="w-28">
                            <label className="text-xs text-white/60 block mb-1">מחיר</label>
                            <Input
                              placeholder="45.50"
                              type="number"
                              step="0.01"
                              value={newDish.priceCents || ""}
                              onChange={(e) =>
                                setNewDish((p) => ({ ...p, priceCents: parseFloat(e.target.value) || 0 }))
                              }
                            />
                          </div>
                          <Button type="submit">הוסף מנה</Button>
                        </div>
                      </form>
                      <div className="space-y-1">
                        {c.dishes.map((d, index) => (
                          <div key={d.id} className="space-y-1">
                            <DroppableSlot id={`slot-${catId}-${index}`}>
                              <div className="h-2" />
                            </DroppableSlot>
                            <DraggableDishRow
                              dish={d}
                              isDragging={activeDish?.id === d.id}
                              isEditing={editingDish?.id === d.id}
                              editForm={editForm}
                              saveError={editingDish?.id === d.id ? dishSaveError : null}
                              onEditFormChange={setEditForm}
                              onSave={saveDish}
                              onCancelEdit={() => { setEditingDish(null); setDishSaveError(null); }}
                              onDismissError={() => setDishSaveError(null)}
                              onStartEdit={() => { startEditDish(d); setDishSaveError(null); }}
                              onDelete={() => deleteDish(d.id)}
                            />
                          </div>
                        ))}
                        <DroppableSlot id={`slot-${catId}-${c.dishes.length}`}>
                          <div className="h-6" />
                        </DroppableSlot>
                      </div>
                    </>
                  );
                }}
              />
            </div>
          ))}
        </div>
        </SortableContext>
        <DragOverlay>
          {activeCategory ? (
            <div className="flex items-center justify-between p-4 rounded-lg bg-[#0e1118] border-2 border-[#37C27D] shadow-xl opacity-95">
              <GripVertical className="w-5 h-5 text-white/40 shrink-0" />
              <div className="flex-1 min-w-0 text-right">
                <p className="font-semibold">{activeCategory.name}</p>
                <p className="text-sm text-muted-foreground">{activeCategory.dishes.length} מנות</p>
              </div>
            </div>
          ) : activeDish ? (
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
