"use client";

import { useOrderSession, type CartItemDto } from "@/components/restaurant/OrderSessionContext";
import { DishExpansionModal, type DishForExpansion } from "@/components/restaurant/DishExpansionModal";
import { useEffect, useState, useCallback } from "react";

function formatPrice(cents: number): string {
  const n = cents / 100;
  return n % 1 === 0 ? n.toString() : parseFloat(n.toFixed(2)).toString();
}

type SelectionItem = {
  paramCategoryId?: number;
  parameterId?: number;
  paramCategoryName?: string;
  parameterName?: string;
};

function getParameterPriceCents(
  dish: MenuDishForSummary | null | undefined,
  paramCategoryId: number,
  parameterId: number
): number | undefined {
  if (!dish?.paramCategories) return undefined;
  const cat = dish.paramCategories.find((c) => c.id === paramCategoryId);
  const param = cat?.parameters.find((p) => p.id === parameterId);
  return param?.priceCents;
}

function selectionsToDisplayLines(
  selections: unknown,
  dish: MenuDishForSummary | null | undefined
): string[] {
  if (!selections || !Array.isArray(selections)) return [];
  return (selections as SelectionItem[])
    .filter((s) => s.parameterName != null || s.paramCategoryName != null)
    .map((s) => {
      const name = s.parameterName != null ? s.parameterName : `${s.paramCategoryName ?? ""}`;
      const catId = s.paramCategoryId;
      const paramId = s.parameterId;
      const priceCents =
        catId != null && paramId != null ? getParameterPriceCents(dish, catId, paramId) : undefined;
      if (priceCents != null && priceCents > 0) return `${name} (+${formatPrice(priceCents)})`;
      return name;
    });
}

function selectionsToRecord(selections: unknown): Record<number, number[]> {
  const out: Record<number, number[]> = {};
  if (!selections || !Array.isArray(selections)) return out;
  (selections as SelectionItem[]).forEach((s) => {
    const catId = s.paramCategoryId;
    const paramId = s.parameterId;
    if (catId != null && paramId != null) {
      if (!out[catId]) out[catId] = [];
      out[catId].push(paramId);
    }
  });
  return out;
}

export interface MenuDishForSummary {
  id: number;
  title: string;
  imageUrl: string | null;
  description: string | null;
  priceCents: number;
  paramCategories: Array<{
    id: number;
    name: string;
    sortOrder: number;
    minSelections: number;
    maxSelections: number;
    parameters: Array<{ id: number; name: string; sortOrder: number; priceCents: number }>;
  }>;
}

/** הופך hex ל־rgba עם alpha (0–1) */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function OrderSummaryPage({
  priceColor = "#fffbeb",
  primaryColor = "#1c1917",
  textColor = "#fafaf9",
  descriptionColor = "#a8a29e",
  cartColor = "#1c1917",
  cartTextColor = "#ffffff",
  summaryCardColor,
  menuDishes = [],
}: {
  priceColor?: string;
  primaryColor?: string;
  textColor?: string;
  descriptionColor?: string;
  cartColor?: string;
  cartTextColor?: string;
  summaryCardColor?: string | null;
  menuDishes?: MenuDishForSummary[];
}) {
  const orderSession = useOrderSession();
  const [editingCartItem, setEditingCartItem] = useState<CartItemDto | null>(null);

  useEffect(() => {
    orderSession?.refreshCart();
  }, [orderSession]);

  const editDish: DishForExpansion | null =
    editingCartItem && menuDishes.length > 0
      ? (() => {
          const d = menuDishes.find((m) => m.id === editingCartItem.dishId);
          if (!d) return null;
          return {
            id: d.id,
            title: d.title,
            imageUrl: d.imageUrl,
            description: d.description,
            priceCents: d.priceCents,
            paramCategories: d.paramCategories,
          };
        })()
      : null;

  const handleUpdate = useCallback(
    async (payload: { dishId: number; quantity: number; priceCents: number; selections?: unknown }) => {
      if (!editingCartItem || !orderSession) return;
      await orderSession.removeCartItem(editingCartItem.id);
      await orderSession.addToCart(payload.dishId, payload.quantity, payload.priceCents, payload.selections);
      setEditingCartItem(null);
    },
    [editingCartItem, orderSession]
  );

  const handleRemove = useCallback(async () => {
    if (!editingCartItem || !orderSession) return;
    await orderSession.removeCartItem(editingCartItem.id);
    setEditingCartItem(null);
  }, [editingCartItem, orderSession]);

  if (!orderSession) return null;

  const { cartItems, updateCartItemQuantity, removeCartItem } = orderSession;
  const totalCents = cartItems.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);

  return (
    <main className="flex-1 p-4 pb-8">
      <section className="mb-6">
        <h2 className="text-base font-semibold text-white/90 mb-3">פריטים בהזמנה</h2>
        {cartItems.length === 0 ? (
          <p className="text-stone-400 text-center py-12">אין פריטים בהזמנה. הוסף מנות מהתפריט.</p>
        ) : (
          <ul className="space-y-3">
            {cartItems.map((item) => {
              const dishForParams = menuDishes.find((m) => m.id === item.dishId);
              const selectionLines = selectionsToDisplayLines(item.selections, dishForParams);
              return (
                <li
                  key={item.id}
                  className="flex gap-3 p-4 rounded-xl border border-white/5"
                  style={
                    summaryCardColor
                      ? { backgroundColor: hexToRgba(summaryCardColor, 0.6) }
                      : { backgroundColor: "rgba(41, 37, 36, 0.6)" }
                  }
                >
                  <button
                    type="button"
                    onClick={() => setEditingCartItem(item)}
                    className="flex gap-3 flex-1 min-w-0 text-right rounded-lg hover:bg-white/5 transition-colors -m-2 p-2 pr-1"
                  >
                    {item.dish.imageUrl && (
                      <img
                        src={item.dish.imageUrl}
                        alt=""
                        className="w-20 h-20 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="font-medium text-white">{item.dish.title}</p>
                      {selectionLines.length > 0 ? (
                        <div className="text-sm mt-1 text-white/70 space-y-0.5">
                          {selectionLines.map((line, i) => (
                            <p key={i} className="break-words">
                              {line}
                            </p>
                          ))}
                        </div>
                      ) : null}
                      <p className="text-sm mt-1" style={{ color: priceColor }}>
                        ₪{formatPrice(item.priceCents)} × {item.quantity}
                      </p>
                    </div>
                  </button>
                  <div className="flex flex-col items-center justify-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCartItem(item.id);
                      }}
                      className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg text-base leading-none"
                      aria-label="הסר"
                    >
                      🗑
                    </button>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCartItemQuantity(item.id, Math.max(0, item.quantity - 1));
                        }}
                        className="w-7 h-7 rounded-full bg-white/20 text-white text-sm font-bold flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="w-5 min-w-5 text-center text-white text-sm font-medium">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateCartItemQuantity(item.id, item.quantity + 1);
                        }}
                        className="w-7 h-7 rounded-full bg-white/20 text-white text-sm font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {cartItems.length > 0 && (
        <div className="sticky bottom-0 p-4 rounded-xl bg-stone-800 border border-white/10">
          <p className="text-xl font-bold text-white">סה״כ: ₪{formatPrice(totalCents)}</p>
          <p className="text-xs text-stone-400 mt-1">סיום הזמנה ופלט למטבח – יגיע בשלב הבא</p>
        </div>
      )}

      {editDish && editingCartItem && (
        <DishExpansionModal
          open={true}
          onOpenChange={(open) => !open && setEditingCartItem(null)}
          dish={editDish}
          primaryColor={primaryColor}
          priceColor={priceColor}
          textColor={textColor}
          descriptionColor={descriptionColor}
          cartColor={cartColor}
          cartTextColor={cartTextColor}
          isAdminMode={false}
          mode="edit"
          initialQuantity={editingCartItem.quantity}
          initialSelections={selectionsToRecord(editingCartItem.selections)}
          onUpdate={handleUpdate}
          onRemove={handleRemove}
        />
      )}
    </main>
  );
}
