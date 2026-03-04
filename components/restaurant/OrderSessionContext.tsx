"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type CartItemDto = {
  id: number;
  dishId: number;
  dish: { id: number; title: string; imageUrl: string | null; priceCents: number };
  quantity: number;
  priceCents: number;
  selections: unknown;
};

type OrderSessionContextValue = {
  slug: string;
  token: string;
  expiresAt: string;
  label: string | null;
  cartItems: CartItemDto[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItemDto[]>>;
  addToCart: (dishId: number, quantity: number, priceCents: number, selections?: unknown) => Promise<void>;
  updateCartItemQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeCartItem: (itemId: number) => Promise<void>;
  refreshCart: () => Promise<void>;
};

const OrderSessionContext = createContext<OrderSessionContextValue | null>(null);

export function useOrderSession() {
  return useContext(OrderSessionContext);
}

export function OrderSessionProvider({
  children,
  slug,
  token,
  expiresAt,
  label,
  initialCart,
}: {
  children: ReactNode;
  slug: string;
  token: string;
  expiresAt: string;
  label: string | null;
  initialCart: CartItemDto[];
}) {
  const [cartItems, setCartItems] = useState<CartItemDto[]>(initialCart);

  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch(`/api/r/${slug}/session/${token}/cart`);
      if (res.ok) {
        const data = await res.json();
        setCartItems(data);
      }
    } catch {
      // ignore
    }
  }, [slug, token]);

  const addToCart = useCallback(
    async (dishId: number, quantity: number, priceCents: number, selections?: unknown) => {
      try {
        const res = await fetch(`/api/r/${slug}/session/${token}/cart`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dishId, quantity, priceCents, selections }),
        });
        if (!res.ok) return;
        const item = await res.json();
        setCartItems((prev) => [...prev, item]);
      } catch {
        // ignore
      }
    },
    [slug, token]
  );

  const updateCartItemQuantity = useCallback(
    async (itemId: number, quantity: number) => {
      try {
        const res = await fetch(`/api/r/${slug}/session/${token}/cart/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.deleted) {
          setCartItems((prev) => prev.filter((i) => i.id !== itemId));
          return;
        }
        setCartItems((prev) => prev.map((i) => (i.id === itemId ? data : i)));
      } catch {
        // ignore
      }
    },
    [slug, token]
  );

  const removeCartItem = useCallback(
    async (itemId: number) => {
      try {
        const res = await fetch(`/api/r/${slug}/session/${token}/cart/${itemId}`, {
          method: "DELETE",
        });
        if (!res.ok) return;
        setCartItems((prev) => prev.filter((i) => i.id !== itemId));
      } catch {
        // ignore
      }
    },
    [slug, token]
  );

  const value: OrderSessionContextValue = {
    slug,
    token,
    expiresAt,
    label,
    cartItems,
    setCartItems,
    addToCart,
    updateCartItemQuantity,
    removeCartItem,
    refreshCart,
  };

  return (
    <OrderSessionContext.Provider value={value}>
      {children}
    </OrderSessionContext.Provider>
  );
}
