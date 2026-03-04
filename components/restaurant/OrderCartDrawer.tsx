"use client";

import { useEffect } from "react";
import type { CartItemDto } from "./OrderSessionContext";

function formatPrice(cents: number): string {
  const n = cents / 100;
  return n % 1 === 0 ? n.toString() : parseFloat(n.toFixed(2)).toString();
}

interface OrderCartDrawerProps {
  cartItems: CartItemDto[];
  onClose: () => void;
  onUpdateQuantity: (itemId: number, quantity: number) => Promise<void>;
  onRemove: (itemId: number) => Promise<void>;
  priceColor?: string;
}

export function OrderCartDrawer({
  cartItems,
  onClose,
  onUpdateQuantity,
  onRemove,
  priceColor = "#fffbeb",
}: OrderCartDrawerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const totalCents = cartItems.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" dir="rtl">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative ml-auto w-full max-w-md h-[85%] max-h-[600px] bg-stone-900 rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300"
        role="dialog"
        aria-label="סוכם הזמנה"
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-bold text-white">סוכם הזמנה</h2>
            <p className="text-xs text-white/60 mt-0.5">הפריטים שהזמנת</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white"
            aria-label="סגור"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartItems.length === 0 ? (
            <p className="text-stone-400 text-center py-8">אין פריטים בהזמנה. הוסף מנות מהתפריט.</p>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 p-3 rounded-xl bg-stone-800/80 border border-white/5"
              >
                {item.dish.imageUrl && (
                  <img
                    src={item.dish.imageUrl}
                    alt=""
                    className="w-16 h-16 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{item.dish.title}</p>
                  <p className="text-sm" style={{ color: priceColor }}>
                    ₪{formatPrice(item.priceCents)} × {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id, Math.max(0, item.quantity - 1))}
                    className="w-8 h-8 rounded-full bg-white/20 text-white font-bold flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-white font-medium">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-white/20 text-white font-bold flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                  aria-label="הסר"
                >
                  🗑
                </button>
              </div>
            ))
          )}
        </div>
        {cartItems.length > 0 && (
          <div className="p-4 border-t border-white/10">
            <p className="text-lg font-bold text-white mb-2">
              סה״כ: ₪{formatPrice(totalCents)}
            </p>
            <p className="text-xs text-stone-400">סיום הזמנה ופלט למטבח – יגיע בשלב הבא</p>
          </div>
        )}
      </div>
    </div>
  );
}
