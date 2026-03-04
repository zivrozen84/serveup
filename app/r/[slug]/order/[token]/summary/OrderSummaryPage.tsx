"use client";

import { useOrderSession } from "@/components/restaurant/OrderSessionContext";
import { useEffect } from "react";

function formatPrice(cents: number): string {
  const n = cents / 100;
  return n % 1 === 0 ? n.toString() : parseFloat(n.toFixed(2)).toString();
}

export function OrderSummaryPage({ priceColor = "#fffbeb" }: { priceColor?: string }) {
  const orderSession = useOrderSession();
  useEffect(() => {
    orderSession?.refreshCart();
  }, [orderSession]);

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
            {cartItems.map((item) => (
              <li
                key={item.id}
                className="flex gap-3 p-4 rounded-xl bg-stone-800/80 border border-white/5"
              >
                {item.dish.imageUrl && (
                  <img
                    src={item.dish.imageUrl}
                    alt=""
                    className="w-20 h-20 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white">{item.dish.title}</p>
                  <p className="text-sm mt-1" style={{ color: priceColor }}>
                    ₪{formatPrice(item.priceCents)} × {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateCartItemQuantity(item.id, Math.max(0, item.quantity - 1))}
                    className="w-9 h-9 rounded-full bg-white/20 text-white font-bold flex items-center justify-center"
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-white font-medium">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                    className="w-9 h-9 rounded-full bg-white/20 text-white font-bold flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeCartItem(item.id)}
                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg shrink-0"
                  aria-label="הסר"
                >
                  🗑
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {cartItems.length > 0 && (
        <div className="sticky bottom-0 p-4 rounded-xl bg-stone-800 border border-white/10">
          <p className="text-xl font-bold text-white">סה״כ: ₪{formatPrice(totalCents)}</p>
          <p className="text-xs text-stone-400 mt-1">סיום הזמנה ופלט למטבח – יגיע בשלב הבא</p>
        </div>
      )}
    </main>
  );
}
