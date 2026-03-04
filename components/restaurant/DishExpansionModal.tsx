"use client";

import { useState, useCallback, useEffect, useRef } from "react";
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
  /** צבע כפתור הוסף לעגלה */
  cartColor?: string;
  /** צבע טקסט כפתור הוסף לעגלה */
  cartTextColor?: string;
  /** רקע אזור עגלה (URL תמונה) */
  cartBackgroundUrl?: string | null;
  /** אטימות שכבת הכהות על רקע עגלה 0–100 (ברירת מחדל 45) */
  cartBarOverlayOpacity?: number | null;
  /** נראות כפתור הוסף לעגלה ו+/- 0–100 (100=אטום) – המחיר לא מושפע */
  cartBarControlsOpacity?: number | null;
  /** אטימות השחרת רקע מודאל ההרחבה 0–100 (ברירת מחדל 70) */
  expansionBackdropOpacity?: number | null;
  isAdminMode: boolean;
  embedInPhone?: boolean;
  copiedParamSourceDishId?: number | null;
  onCopyParams?: () => void;
  onPasteParams?: () => Promise<void>;
  canPasteParams?: boolean;
  onParamsUpdated?: () => void;
}

export function DishExpansionModal({
  open,
  onOpenChange,
  dish,
  primaryColor,
  priceColor,
  textColor,
  descriptionColor,
  cartColor: cartColorProp,
  cartTextColor: cartTextColorProp,
  cartBackgroundUrl,
  cartBarOverlayOpacity,
  cartBarControlsOpacity,
  expansionBackdropOpacity,
  isAdminMode,
  embedInPhone = false,
  copiedParamSourceDishId,
  onCopyParams,
  onPasteParams,
  canPasteParams,
  onParamsUpdated,
}: DishExpansionModalProps) {
  const cartColor = cartColorProp || primaryColor;
  const cartTextColor = cartTextColorProp || "#ffffff";
  const controlsOpacity = (cartBarControlsOpacity ?? 100) / 100;
  const [paramCategories, setParamCategories] = useState<ParamCategory[]>(dish.paramCategories);
  const [selections, setSelections] = useState<Record<number, number[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [addingParamToCatId, setAddingParamToCatId] = useState<number | null>(null);
  const [newParamName, setNewParamName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [pasting, setPasting] = useState(false);
  const [editingParamPriceId, setEditingParamPriceId] = useState<number | null>(null);
  const [editingParamPriceVal, setEditingParamPriceVal] = useState("");
  const categoryRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [pressedParamKey, setPressedParamKey] = useState<string | null>(null);
  const [priceBump, setPriceBump] = useState(false);
  const prevPriceRef = useRef(0);
  const [quantityPressed, setQuantityPressed] = useState<"minus" | "plus" | null>(null);
  const [addButtonShrink, setAddButtonShrink] = useState(false);
  const [cartBarGlow, setCartBarGlow] = useState(false);
  const [highlightMissingCatId, setHighlightMissingCatId] = useState<number | null>(null);

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

  const totalPriceCents =
    dish.priceCents * quantity +
    paramCategories.reduce((sum, cat) => {
      const sel = selections[cat.id] ?? [];
      const add = cat.parameters.filter((p) => sel.includes(p.id)).reduce((a, p) => a + p.priceCents, 0);
      return sum + add * quantity;
    }, 0);

  const setCategoryRequired = useCallback(
    async (catId: number, required: boolean) => {
      const min = required ? 1 : 0;
      const res = await fetch(`/api/admin/parameter-categories/${catId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minSelections: min }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setParamCategories((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, minSelections: updated.minSelections } : c))
      );
      onParamsUpdated?.();
    },
    [onParamsUpdated]
  );

  const setCategoryMultiple = useCallback(
    async (catId: number, allowMultiple: boolean) => {
      const max = allowMultiple ? 10 : 1;
      const res = await fetch(`/api/admin/parameter-categories/${catId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxSelections: max }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setParamCategories((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, maxSelections: updated.maxSelections } : c))
      );
      onParamsUpdated?.();
    },
    [onParamsUpdated]
  );

  const saveParamPrice = useCallback(
    async (paramId: number, cents: number) => {
      const res = await fetch(`/api/admin/parameters/${paramId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceCents: cents }),
      });
      if (!res.ok) return;
      const updated = await res.json();
      setParamCategories((prev) =>
        prev.map((c) => ({
          ...c,
          parameters: c.parameters.map((p) => (p.id === paramId ? { ...p, priceCents: updated.priceCents } : p)),
        }))
      );
      setEditingParamPriceId(null);
      setEditingParamPriceVal("");
      onParamsUpdated?.();
    },
    [onParamsUpdated]
  );

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
    onParamsUpdated?.();
  }, [dish.id, newCategoryName, onParamsUpdated]);

  const firstMissingRequiredCatId = paramCategories.find((cat) => cat.minSelections >= 1 && ((selections[cat.id] ?? []).length < cat.minSelections))?.id ?? null;

  // Clear highlight when user has selected enough in the highlighted category
  useEffect(() => {
    if (highlightMissingCatId == null) return;
    const cat = paramCategories.find((c) => c.id === highlightMissingCatId);
    if (cat && (selections[cat.id] ?? []).length >= cat.minSelections) setHighlightMissingCatId(null);
  }, [highlightMissingCatId, paramCategories, selections]);

  useEffect(() => {
    if (totalPriceCents > prevPriceRef.current) {
      setPriceBump(true);
      const t = setTimeout(() => setPriceBump(false), 300);
      return () => clearTimeout(t);
    }
    prevPriceRef.current = totalPriceCents;
  }, [totalPriceCents]);
  useEffect(() => {
    if (open) prevPriceRef.current = totalPriceCents;
  }, [open]);

  const content = (
    <div className={`flex flex-col w-full h-full min-h-0 bg-stone-900 text-white rounded-t-2xl overflow-hidden ${embedInPhone ? "max-h-full" : "max-w-[420px] mx-auto max-h-[85vh] shadow-2xl"}`}>
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
      <div
        className="flex-1 min-h-0 flex flex-col min-w-0 bg-cover bg-center bg-no-repeat relative"
        style={
          cartBackgroundUrl
            ? { backgroundImage: `url(${cartBackgroundUrl})` }
            : undefined
        }
      >
        {cartBackgroundUrl && (
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: `rgba(0,0,0,${(100 - (expansionBackdropOpacity ?? 70)) / 100})`,
            }}
            aria-hidden
          />
        )}
        <div
          ref={scrollAreaRef}
          className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-4"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y", overscrollBehaviorY: "contain" }}
        >
        <div>
          <h2 className="text-xl font-bold" style={{ color: textColor }}>{dish.title}</h2>
          {dish.description && (
            <p className="text-sm mt-2 leading-relaxed" style={{ color: descriptionColor }}>{dish.description}</p>
          )}
        </div>

        {isAdminMode && (
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={onCopyParams}
              className="py-2 px-3 rounded-lg border border-white/40 text-white/90 text-sm hover:bg-white/10"
            >
              העתק פרמטרים
            </button>
            <button
              type="button"
              disabled={!canPasteParams || pasting}
              onClick={async () => {
                if (!onPasteParams) return;
                setPasting(true);
                try {
                  await onPasteParams();
                } finally {
                  setPasting(false);
                }
              }}
              className="py-2 px-3 rounded-lg font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {pasting ? "מדביק…" : "הדבק פרמטרים"}
            </button>
          </div>
        )}

        {paramCategories.map((cat) => (
          <div
            key={cat.id}
            ref={(el) => { categoryRefs.current[cat.id] = el; }}
            className={`space-y-2 rounded-lg p-2 transition-colors duration-200 ${
              highlightMissingCatId === cat.id ? "ring-2 ring-red-500/80 bg-red-500/10" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-white">{cat.name}</h3>
                {highlightMissingCatId === cat.id && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold shrink-0" title="נא לבחור כאן">!</span>
                )}
                {isAdminMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCategoryRequired(cat.id, cat.minSelections < 1)}
                      className={`text-xs px-2 py-1 rounded ${cat.minSelections >= 1 ? "bg-amber-600/80 text-white" : "bg-white/20 text-white/80"}`}
                    >
                      {cat.minSelections >= 1 ? "חובה" : "לא חובה"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCategoryMultiple(cat.id, cat.maxSelections <= 1)}
                      className={`text-xs px-2 py-1 rounded ${cat.maxSelections > 1 ? "bg-emerald-600/80 text-white" : "bg-white/20 text-white/80"}`}
                      title="ריבוי בחירות"
                    >
                      {cat.maxSelections > 1 ? "✓ ריבוי" : "בחירה אחת"}
                    </button>
                  </>
                ) : cat.minSelections >= 1 ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-600/80 text-white">חובה</span>
                ) : null}
              </div>
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
              <div className="flex flex-wrap gap-2 items-center">
                {cat.parameters.map((p) => {
                  const paramKey = `${cat.id}-${p.id}`;
                  const isPressed = pressedParamKey === paramKey;
                  return (
                  <span key={p.id} className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleParam(cat.id, p.id)}
                      onPointerDown={() => setPressedParamKey(paramKey)}
                      onPointerUp={() => setPressedParamKey(null)}
                      onPointerLeave={() => setPressedParamKey(null)}
                      className={`px-4 py-2 rounded-full text-sm border transition-transform duration-150 ${(selections[cat.id] ?? []).includes(p.id) ? "border-current" : "border-white/40"} ${isPressed ? "scale-110" : ""}`}
                      style={{
                        backgroundColor: (selections[cat.id] ?? []).includes(p.id) ? primaryColor + "40" : "transparent",
                        color: textColor,
                      }}
                    >
                      {p.name}
                      {p.priceCents > 0 && ` (+₪${formatPrice(p.priceCents)})`}
                        </button>
                    {isAdminMode && (
                      editingParamPriceId === p.id ? (
                        <span className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={editingParamPriceVal}
                            onChange={(e) => setEditingParamPriceVal(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveParamPrice(p.id, Math.max(0, Math.round((parseFloat(editingParamPriceVal || "0") || 0) * 100)))}
                            className="w-14 px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white text-xs"
                          />
                          <button type="button" onClick={() => saveParamPrice(p.id, Math.max(0, Math.round((parseFloat(editingParamPriceVal || "0") || 0) * 100)))} className="text-xs text-white/80 hover:text-white">✓</button>
                          <button type="button" onClick={() => { setEditingParamPriceId(null); setEditingParamPriceVal(""); }} className="text-xs text-white/80 hover:text-white">✕</button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setEditingParamPriceId(p.id); setEditingParamPriceVal((p.priceCents / 100).toString()); }}
                          className="text-xs text-white/50 hover:text-white"
                          title="ערוך מחיר תוספת"
                        >
                          {p.priceCents > 0 ? `₪${formatPrice(p.priceCents)}` : "0₪"}
                        </button>
                      )
                    )}
                  </span>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 items-center">
                {cat.parameters.map((p) => {
                  const paramKey = `${cat.id}-${p.id}`;
                  const isPressed = pressedParamKey === paramKey;
                  return (
                  <span key={p.id} className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleParam(cat.id, p.id)}
                      onPointerDown={() => setPressedParamKey(paramKey)}
                      onPointerUp={() => setPressedParamKey(null)}
                      onPointerLeave={() => setPressedParamKey(null)}
                      className={`px-4 py-2 rounded-full text-sm border transition-transform duration-150 ${(selections[cat.id] ?? []).includes(p.id) ? "border-current" : "border-white/40"} ${isPressed ? "scale-110" : ""}`}
                      style={{
                        backgroundColor: (selections[cat.id] ?? []).includes(p.id) ? primaryColor + "40" : "transparent",
                        color: textColor,
                      }}
                    >
                      {p.name}
                      {p.priceCents > 0 && ` (+₪${formatPrice(p.priceCents)})`}
                    </button>
                    {isAdminMode && (
                      editingParamPriceId === p.id ? (
                        <span className="flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={editingParamPriceVal}
                            onChange={(e) => setEditingParamPriceVal(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveParamPrice(p.id, Math.max(0, Math.round((parseFloat(editingParamPriceVal || "0") || 0) * 100)))}
                            className="w-14 px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-white text-xs"
                          />
                          <button type="button" onClick={() => saveParamPrice(p.id, Math.max(0, Math.round((parseFloat(editingParamPriceVal || "0") || 0) * 100)))} className="text-xs text-white/80 hover:text-white">✓</button>
                          <button type="button" onClick={() => { setEditingParamPriceId(null); setEditingParamPriceVal(""); }} className="text-xs text-white/80 hover:text-white">✕</button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setEditingParamPriceId(p.id); setEditingParamPriceVal((p.priceCents / 100).toString()); }}
                          className="text-xs text-white/50 hover:text-white"
                          title="ערוך מחיר תוספת"
                        >
                          {p.priceCents > 0 ? `₪${formatPrice(p.priceCents)}` : "0₪"}
                        </button>
                      )
                    )}
                  </span>
                  );
                })}
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

        </div>
        <div
          className="relative shrink-0 p-4 pt-2 border-t border-white/10"
          style={!cartBackgroundUrl ? { backgroundColor: "#1c1917" } : undefined}
        >
          <div className="relative flex items-center gap-3 flex-wrap">
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 bg-white/15"
              style={{ opacity: controlsOpacity }}
            >
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                onPointerDown={() => setQuantityPressed("minus")}
                onPointerUp={() => setQuantityPressed(null)}
                onPointerLeave={() => setQuantityPressed(null)}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold transition-transform duration-150 select-none active:outline-none ${
                  quantityPressed === "minus" ? "scale-110" : ""
                }`}
                style={{ backgroundColor: "rgba(255,255,255,0.25)" }}
              >
                <span className="text-2xl leading-none inline-flex items-center justify-center w-full h-full -translate-y-0.5">−</span>
              </button>
              <span className="w-8 text-center font-bold text-white text-lg">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                onPointerDown={() => setQuantityPressed("plus")}
                onPointerUp={() => setQuantityPressed(null)}
                onPointerLeave={() => setQuantityPressed(null)}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold transition-transform duration-150 select-none active:outline-none ${
                  quantityPressed === "plus" ? "scale-110" : ""
                }`}
                style={{ backgroundColor: "rgba(255,255,255,0.25)" }}
              >
                <span className="text-2xl leading-none inline-flex items-center justify-center w-full h-full -translate-y-0.5">+</span>
              </button>
            </div>
            <span
              className={`font-bold min-w-[4rem] inline-block transition-transform duration-200 ${priceBump ? "scale-110" : ""}`}
              style={{ color: priceColor }}
            >
              ₪{formatPrice(totalPriceCents)}
            </span>
            <button
              type="button"
              onClick={() => {
                if (firstMissingRequiredCatId != null) {
                  setAddButtonShrink(true);
                  setCartBarGlow(true);
                  setHighlightMissingCatId(firstMissingRequiredCatId);
                  const el = categoryRefs.current[firstMissingRequiredCatId];
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                  setTimeout(() => setAddButtonShrink(false), 200);
                  setTimeout(() => setCartBarGlow(false), 200);
                }
                // when valid (firstMissingRequiredCatId == null), add-to-cart would go here if needed
              }}
              className={`flex-1 min-w-[120px] py-3 rounded-xl font-bold transition-all duration-150 ${
                addButtonShrink ? "scale-[0.85]" : "scale-100"
              } ${cartBarGlow ? "shadow-[0_0_16px_4px_rgba(220,38,38,0.6)]" : ""}`}
              style={{ backgroundColor: cartColor, color: cartTextColor, opacity: controlsOpacity }}
            >
              הוסף לעגלה
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const modalBackdropAlpha = 0.7;
  const overlayClass = embedInPhone
    ? "absolute inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    : "fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";
  const contentWrapperClass = embedInPhone
    ? "absolute inset-0 z-50 flex flex-col modal-slide-panel"
    : "fixed left-0 right-0 top-0 z-50 flex justify-center modal-slide-panel";

  const handlePointerDownOutside = useCallback(
    (e: Event) => {
      if (!embedInPhone) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-expansion-overlay]")) return;
      e.preventDefault();
    },
    [embedInPhone]
  );

  const modalInner = (
    <>
      <Dialog.Overlay
        data-expansion-overlay
        className={overlayClass}
        style={{ backgroundColor: "transparent" }}
        {...(embedInPhone && { onClick: () => onOpenChange(false) })}
      />
      <div
        aria-hidden
        data-expansion-overlay
        className={overlayClass}
        style={{
          backgroundColor: `rgba(0,0,0,${modalBackdropAlpha})`,
          pointerEvents: "none",
        }}
      />
      <Dialog.Content
        className={contentWrapperClass}
        onPointerDownOutside={handlePointerDownOutside}
        onInteractOutside={handlePointerDownOutside}
      >
        {embedInPhone ? <div className="absolute inset-0 flex flex-col min-h-0 overflow-hidden">{content}</div> : <div className="w-full max-w-[420px] max-h-[85vh] flex flex-col">{content}</div>}
      </Dialog.Content>
    </>
  );

  useEffect(() => {
    if (!embedInPhone || !open) return;
    const prevOverflow = document.body.style.overflow;
    const prevPointerEvents = document.body.style.pointerEvents;
    document.body.style.overflow = "";
    document.body.style.pointerEvents = "";
    document.body.removeAttribute("data-scroll-locked");
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.pointerEvents = prevPointerEvents;
    };
  }, [embedInPhone, open]);

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange} modal={!embedInPhone}>
      {embedInPhone ? modalInner : <Dialog.Portal>{modalInner}</Dialog.Portal>}
    </Dialog.Root>
  );
}
