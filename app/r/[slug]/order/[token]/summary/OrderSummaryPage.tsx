"use client";

import { useOrderSession, type CartItemDto, type OrderedItemDto } from "@/components/restaurant/OrderSessionContext";
import { DishExpansionModal, type DishForExpansion } from "@/components/restaurant/DishExpansionModal";
import { useEffect, useState, useCallback } from "react";

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

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

type SummaryTab = "cart" | "ordered";

export function OrderSummaryPage({
  priceColor = "#fffbeb",
  primaryColor = "#1c1917",
  textColor = "#fafaf9",
  descriptionColor = "#a8a29e",
  cartColor = "#1c1917",
  cartTextColor = "#ffffff",
  summaryCardColor,
  summaryTabPrimaryColor,
  summaryTabSecondaryColor,
  summarySubmitButtonColor,
  menuDishes = [],
}: {
  priceColor?: string;
  primaryColor?: string;
  textColor?: string;
  descriptionColor?: string;
  cartColor?: string;
  cartTextColor?: string;
  summaryCardColor?: string | null;
  summaryTabPrimaryColor?: string | null;
  summaryTabSecondaryColor?: string | null;
  summarySubmitButtonColor?: string | null;
  menuDishes?: MenuDishForSummary[];
}) {
  const orderSession = useOrderSession();
  const [editingCartItem, setEditingCartItem] = useState<CartItemDto | null>(null);
  const [activeTab, setActiveTab] = useState<SummaryTab>("cart");
  const [submitClickAnim, setSubmitClickAnim] = useState(false);

  const tabPrimary = summaryTabPrimaryColor?.trim() || primaryColor;
  const tabSecondary = summaryTabSecondaryColor?.trim() || "#475569";
  const submitButtonColor = summarySubmitButtonColor?.trim() || "#00CD98";

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

  const { cartItems, orderedItems, updateCartItemQuantity, removeCartItem, submitMyOrder } = orderSession;
  const myTotalCents = cartItems.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
  const orderedItemsCount = orderedItems.reduce((s, i) => s + i.quantity, 0);
  const cartItemsCount = cartItems.reduce((s, i) => s + i.quantity, 0);
  const orderedTotalCents = orderedItems.reduce((s, i) => s + i.priceCents * i.quantity, 0);

  const handleSubmitClick = useCallback(async () => {
    if (cartItems.length === 0) return;
    setSubmitClickAnim(true);
    await submitMyOrder();
    setTimeout(() => setSubmitClickAnim(false), 480);
  }, [cartItems.length, submitMyOrder]);

  const renderItemCard = (
    item: CartItemDto | OrderedItemDto,
    editable: boolean,
    key: string | number
  ) => {
    const dishForParams = menuDishes.find((m) => m.id === item.dishId);
    const selectionLines = selectionsToDisplayLines(item.selections, dishForParams);
    return (
      <li
        key={key}
        className="flex gap-2.5 p-3 rounded-xl border border-white/5"
        style={
          summaryCardColor
            ? { backgroundColor: hexToRgba(summaryCardColor, 0.6) }
            : { backgroundColor: "rgba(41, 37, 36, 0.6)" }
        }
      >
        {editable ? (
          <button
            type="button"
            onClick={() => setEditingCartItem(item as CartItemDto)}
            className="flex gap-2.5 flex-1 min-w-0 text-right rounded-lg hover:bg-white/5 transition-colors -m-1.5 p-1.5 pr-0.5"
          >
            {item.dish.imageUrl && (
              <img
                src={item.dish.imageUrl}
                alt=""
                className="w-14 h-14 rounded-lg object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="font-medium text-white text-sm">{item.dish.title}</p>
              {selectionLines.length > 0 ? (
                <div className="text-xs mt-0.5 text-white/70 space-y-0.5">
                  {selectionLines.map((line, i) => (
                    <p key={i} className="break-words">{line}</p>
                  ))}
                </div>
              ) : null}
              <p className="text-xs mt-0.5" style={{ color: priceColor }}>
                ₪{formatPrice(item.priceCents)} × {item.quantity}
              </p>
            </div>
          </button>
        ) : (
          <div className="flex gap-2.5 flex-1 min-w-0">
            {item.dish.imageUrl && (
              <img
                src={item.dish.imageUrl}
                alt=""
                className="w-14 h-14 rounded-lg object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <p className="font-medium text-white text-sm">{item.dish.title}</p>
              {selectionLines.length > 0 ? (
                <div className="text-xs mt-0.5 text-white/70 space-y-0.5">
                  {selectionLines.map((line, i) => (
                    <p key={i} className="break-words">{line}</p>
                  ))}
                </div>
              ) : null}
              <p className="text-xs mt-0.5" style={{ color: priceColor }}>
                ₪{formatPrice(item.priceCents)} × {item.quantity}
              </p>
            </div>
          </div>
        )}
        {editable && (
          <div className="flex items-center justify-center gap-1 shrink-0">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateCartItemQuantity(item.id, Math.max(0, item.quantity - 1));
                }}
                className="w-6 h-6 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center"
              >
                −
              </button>
              <span className="w-4 min-w-4 text-center text-white text-xs font-medium">
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateCartItemQuantity(item.id, Math.min(10, item.quantity + 1));
                }}
                className="w-6 h-6 rounded-full bg-white/20 text-white text-xs font-bold flex items-center justify-center"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeCartItem(item.id);
              }}
              className="p-1 text-stone-400 hover:text-red-500 transition-colors rounded"
              aria-label="הסר"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </li>
    );
  };

  return (
    <main className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <div
          className={`absolute inset-0 overflow-y-auto p-4 pb-4 scrollbar-hide transition-opacity duration-300 ease-out ${
            activeTab === "cart" ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
          }`}
        >
          <section>
            <h2 className="text-base font-semibold text-white/90 mb-3">סל שלי</h2>
            {cartItems.length === 0 ? (
              <p className="text-stone-400 text-sm py-4">אין פריטים בסל. הוסף מנות מהתפריט.</p>
            ) : (
              <ul className="space-y-3">
                {cartItems.map((item) => renderItemCard(item, true, item.id))}
              </ul>
            )}
          </section>
        </div>
        <div
          className={`absolute inset-0 overflow-y-auto p-4 pb-4 scrollbar-hide transition-opacity duration-300 ease-out ${
            activeTab === "ordered" ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
          }`}
        >
          <section>
            <h2 className="text-base font-semibold text-white/90 mb-3">הוזמן</h2>
            {orderedItems.length === 0 ? (
              <p className="text-stone-400 text-sm py-4">עדיין לא נשלחו פריטים.</p>
            ) : (
              <ul className="space-y-3">
                {orderedItems.map((item, idx) => renderItemCard(item, false, `ordered-${item.submissionId}-${item.id}-${idx}`))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <div className="shrink-0 z-20 flex flex-col w-full border-t border-white/10 bg-stone-900/98 backdrop-blur-md">
        {activeTab === "cart" && (
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] py-2 px-3">
            <span className="text-white/80 text-xs font-medium tabular-nums">סה״כ: ₪{formatPrice(myTotalCents)}</span>
            <button
              type="button"
              onClick={cartItems.length > 0 ? handleSubmitClick : undefined}
              disabled={cartItems.length === 0}
              className={`submit-btn-hero py-2 px-4 text-white font-semibold text-xs tracking-[0.04em] rounded-lg disabled:opacity-40 disabled:cursor-default ${cartItems.length > 0 && !submitClickAnim ? "submit-btn-hero-idle" : ""} ${submitClickAnim ? "submit-btn-hero-click" : ""}`}
              style={{
                backgroundColor: cartItems.length > 0 ? submitButtonColor : "rgba(255,255,255,0.06)",
                letterSpacing: "0.04em",
                ...(cartItems.length > 0 && !submitClickAnim && {
                  boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
                }),
              }}
            >
              לתשלום
            </button>
          </div>
        )}
        {activeTab === "ordered" && (
          <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] py-2 px-3">
            <span className="text-white/80 text-xs font-medium tabular-nums">סה״כ: ₪{formatPrice(orderedTotalCents)}</span>
            <span className="text-white/60 text-xs font-medium">לתשלום</span>
          </div>
        )}
        <div className="flex w-full">
          <button
            type="button"
            onClick={() => setActiveTab("cart")}
            className="relative flex-1 min-w-0 py-2.5 text-white font-bold text-xs transition-[background-color,transform] duration-300 ease-out"
            style={{
              backgroundColor: activeTab === "cart" ? tabPrimary : tabSecondary,
              color: "#fff",
              transform: activeTab === "cart" ? "scale(1.02)" : "scale(1)",
            }}
          >
            סל שלי
            {cartItemsCount > 0 && (
              <span
                key={cartItemsCount}
                className="cart-badge-pop absolute top-1.5 right-2 min-w-[16px] h-[16px] rounded-full bg-white/25 text-white text-[10px] font-medium flex items-center justify-center px-0.5"
              >
                {cartItemsCount > 99 ? "99+" : cartItemsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ordered")}
            className="relative flex-1 min-w-0 py-2.5 text-white font-bold text-xs transition-[background-color,transform] duration-300 ease-out"
            style={{
              backgroundColor: activeTab === "ordered" ? tabPrimary : tabSecondary,
              color: "#fff",
              transform: activeTab === "ordered" ? "scale(1.02)" : "scale(1)",
            }}
          >
            הוזמן
            {orderedItemsCount > 0 && (
              <span
                key={orderedItemsCount}
                className="cart-badge-pop absolute top-1.5 right-2 min-w-[16px] h-[16px] rounded-full bg-white/25 text-white text-[10px] font-medium flex items-center justify-center px-0.5"
              >
                {orderedItemsCount > 99 ? "99+" : orderedItemsCount}
              </span>
            )}
          </button>
        </div>
      </div>

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
