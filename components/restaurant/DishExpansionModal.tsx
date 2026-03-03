"use client";

import { useState, useCallback, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";

function formatPrice(cents: number): string {
  const n = cents / 100;
  return n % 1 === 0 ? n.toString() : parseFloat(n.toFixed(2)).toString();
}

export interface ParamCategory {
  id: number;
  name: string;
  sortOrder: number;
  minSelections: number;
  maxSelections: number;
  parameters: Array<{ id: number; name: string; sortOrder: number; priceCents: number }>;
}

export interface DishForExpansion {
  id: number;
  title: string;
  imageUrl: string | null;
  description: string | null;
  priceCents: number;
  paramCategories: ParamCategory[];
}

interface DishExpansionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dish: DishForExpansion;
  primaryColor: string;
  priceColor: string;
  textColor: string;
  descriptionColor: string;
  isAdminMode: boolean;
  /** כשמופעל – המודאל נשאר בתוך מסגרת האייפון (ללא פורטל) */
  embedInPhone?: boolean;
}

export function DishExpansionModal({
  open,
  onOpenChange,
  dish,
  primaryColor,
  priceColor,
  textColor,
  descriptionColor,
  isAdminMode,
  embedInPhone = false,
}: DishExpansionModalProps) {
  const [paramCategories, setParamCategories] = useState<ParamCategory[]>(dish.paramCategories);
  const [selections, setSelections] = useState<Record<number, number[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [addingParamToCatId, setAddingParamToCatId] = useState<number | null>(null);
  const [newParamName, setNewParamName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    if (open) setParamCategories(dish.paramCategories);
  }, [open, dish.paramCategories]);

  const resetState = useCallback(() => {
    setParamCategories(dish.paramCategories);
    setSelections({});
    setQuantity(1);
    setAddingParamToCatId(null);
    setNewParamName("");
    setAddingCategory(false);
    setNewCategoryName("");
  }, [dish.paramCategories]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) resetState();
      onOpenChange(next);
    },
    [onOpenChange, resetState]
  );

  const toggleParam = (catId: number, paramId: number) => {
    const cat = paramCategories.find((c) => c.id === catId);
    if (!cat) return;
    const current = selections[catId] ?? [];
    const idx = current.indexOf(paramId);
    let next: number[];
    if (idx >= 0) {
      next = current.filter((_, i) => i !== idx);
    } else {
      if (cat.maxSelections <= 1) next = [paramId];
      else next = current.length >= cat.maxSelections ? [...current.slice(1), paramId] : [...current, paramId];
    }
    setSelections((s) => ({ ...s, [catId]: next }));
  };

  const addParameter = useCallback(
    async (categoryId: number) => {
      if (!newParamName.trim()) return;
      const res = await fetch(`/api/admin/parameter-categories/${categoryId}/parameters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newParamName.trim() }),
      });
      if (!res.ok) return;
      const created = await res.json();
      setParamCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId ? { ...c, parameters: [...c.parameters, created] } : c
        )
      );
      setNewParamName("");
      setAddingParamToCatId(null);
    },
    [newParamName]
  );

  const addParameterCategory = useCallback(async () => {
    if (!newCategoryName.trim()) return;
    const res = await fetch(`/api/admin/dishes/${dish.id}/parameter-categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName.trim() }),
    });
    if (!res.ok) return;
    const created = await res.json();
    setParamCategories((prev) => [...prev, created]);
    setNewCategoryName("");
    setAddingCategory(false);
  }, [dish.id, newCategoryName]);

  const content = (
    <div className={`flex flex-col w-full h-full bg-stone-900 text-white rounded-t-2xl overflow-hidden ${embedInPhone ? "max-h-full" : "max-w-[420px] mx-auto max-h-[85vh] shadow-2xl"}`}>
      <div className="relative shrink-0 h-[180px] bg-stone-800">
        {dish.imageUrl ? (
          <img src={dish.imageUrl} alt={dish.title} className="w-full h-full object-cover object-center" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: primaryColor + "60" }}>
            <span className="text-4xl text-white/50">?</span>
          </div>
        )}
        <Dialog.Close className="absolute top-3 left-3 w-10 h-10 rounded-full bg-black/60 flex items-center justify-center text-white">
          ✕
        </Dialog.Close>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h2 className="text-xl font-bold" style={{ color: textColor }}>{dish.title}</h2>
          <p className="font-bold mt-1" style={{ color: priceColor }}>₪{formatPrice(dish.priceCents)}</p>
          {dish.description && (
            <p className="text-sm mt-2 leading-relaxed" style={{ color: descriptionColor }}>{dish.description}</p>
          )}
        </div>

        {paramCategories.map((cat) => (
          <div key={cat.id} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-white">{cat.name}</h3>
              {isAdminMode && (
                <button
                  type="button"
                  onClick={() => setAddingParamToCatId((id) => (id === cat.id ? null : cat.id))}
                  className="shrink-0 flex items-center justify-center text-white hover:opacity-80 text-3xl font-light leading-none"
                >
                  +
                </button>
              )}
            </div>
            {addingParamToCatId === cat.id && (
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={newParamName}
                  onChange={(e) => setNewParamName(e.target.value)}
                  placeholder="שם פרמטר"
                  className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
                />
                <button
                  type="button"
                  onClick={() => addParameter(cat.id)}
                  className="px-3 py-2 rounded-lg font-medium"
                  style={{ backgroundColor: primaryColor }}
                >
                  הוסף
                </button>
              </div>
            )}
            {cat.maxSelections <= 1 ? (
              <div className="flex flex-wrap gap-2">
                {cat.parameters.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleParam(cat.id, p.id)}
                    className={`px-4 py-2 rounded-full text-sm border ${(selections[cat.id] ?? []).includes(p.id) ? "border-current" : "border-white/40"}`}
                    style={{
                      backgroundColor: (selections[cat.id] ?? []).includes(p.id) ? primaryColor + "40" : "transparent",
                      color: textColor,
                    }}
                  >
                    {p.name}
                    {p.priceCents > 0 && ` (+₪${formatPrice(p.priceCents)})`}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cat.parameters.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleParam(cat.id, p.id)}
                    className={`px-4 py-2 rounded-full text-sm border ${(selections[cat.id] ?? []).includes(p.id) ? "border-current" : "border-white/40"}`}
                    style={{
                      backgroundColor: (selections[cat.id] ?? []).includes(p.id) ? primaryColor + "40" : "transparent",
                      color: textColor,
                    }}
                  >
                    {p.name}
                    {p.priceCents > 0 && ` (+₪${formatPrice(p.priceCents)})`}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}

        {isAdminMode && (
          <>
            {addingCategory ? (
              <div className="flex gap-2 items-center pt-2">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="שם קטגוריית פרמטר"
                  className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50"
                />
                <button
                  type="button"
                  onClick={addParameterCategory}
                  className="px-3 py-2 rounded-lg font-medium"
                  style={{ backgroundColor: primaryColor }}
                >
                  הוסף קטגוריה
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingCategory(false); setNewCategoryName(""); }}
                  className="px-3 py-2 rounded-lg border border-white/40"
                >
                  ביטול
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingCategory(true)}
                className="w-full py-3 rounded-xl border-2 border-dashed border-white/40 text-white/80 hover:bg-white/10 flex items-center justify-center gap-2"
              >
                <span className="text-3xl font-light text-white leading-none">+</span>
                הוסף קטגוריית פרמטר
              </button>
            )}
          </>
        )}

        {!isAdminMode && (
          <div className="flex items-center gap-4 pt-4">
            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold border border-white/40"
              >
                −
              </button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold border border-white/40"
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="flex-1 py-3 rounded-xl font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              הוסף לעגלה
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const overlayClass = embedInPhone
    ? "absolute inset-0 bg-black/70 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    : "fixed inset-0 bg-black/70 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";
  const contentWrapperClass = embedInPhone
    ? "absolute inset-0 z-50 flex flex-col modal-slide-panel"
    : "fixed left-0 right-0 top-0 z-50 flex justify-center modal-slide-panel";

  const modalInner = (
    <>
      <Dialog.Overlay className={overlayClass} />
      <Dialog.Content className={contentWrapperClass}>
        {embedInPhone ? <div className="flex-1 flex flex-col min-h-0 overflow-hidden">{content}</div> : <div className="w-full max-w-[420px] max-h-[85vh] flex flex-col">{content}</div>}
      </Dialog.Content>
    </>
  );

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      {embedInPhone ? modalInner : <Dialog.Portal>{modalInner}</Dialog.Portal>}
    </Dialog.Root>
  );
}
