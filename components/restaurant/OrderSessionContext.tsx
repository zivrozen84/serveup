"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

const GUEST_ID_KEY = "serveup_guest_id";

function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export type CartItemDto = {
  id: number;
  dishId: number;
  dish: { id: number; title: string; imageUrl: string | null; priceCents: number };
  quantity: number;
  priceCents: number;
  selections: unknown;
};

export type OrderedItemDto = {
  id: number;
  submissionId: number;
  guestId: string;
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
  guestId: string;
  cartItems: CartItemDto[];
  orderedItems: OrderedItemDto[];
  setCartItems: React.Dispatch<React.SetStateAction<CartItemDto[]>>;
  addToCart: (dishId: number, quantity: number, priceCents: number, selections?: unknown) => Promise<void>;
  updateCartItemQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeCartItem: (itemId: number) => Promise<void>;
  submitMyOrder: () => Promise<void>;
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
  initialOrderedItems = [],
}: {
  children: ReactNode;
  slug: string;
  token: string;
  expiresAt: string;
  label: string | null;
  initialCart: CartItemDto[];
  initialOrderedItems?: OrderedItemDto[];
}) {
  const [guestId, setGuestId] = useState("");
  const [cartItems, setCartItems] = useState<CartItemDto[]>(initialCart);
  const [orderedItems, setOrderedItems] = useState<OrderedItemDto[]>(initialOrderedItems);

  useEffect(() => {
    setGuestId(getOrCreateGuestId());
  }, []);

  const refreshCart = useCallback(async () => {
    if (!guestId) return;
    try {
      const res = await fetch(`/api/r/${slug}/session/${token}/cart?guestId=${encodeURIComponent(guestId)}`);
      if (res.ok) {
        const data = await res.json();
        setCartItems(data.myCart ?? []);
        setOrderedItems(data.orderedItems ?? []);
      }
    } catch {
      // ignore
    }
  }, [slug, token, guestId]);

  useEffect(() => {
    if (guestId) refreshCart();
  }, [guestId, refreshCart]);

  const addToCart = useCallback(
    async (dishId: number, quantity: number, priceCents: number, selections?: unknown) => {
      if (!guestId) return;
      try {
        const res = await fetch(`/api/r/${slug}/session/${token}/cart`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dishId, quantity, priceCents, selections, guestId }),
        });
        if (!res.ok) return;
        const item = await res.json();
        setCartItems((prev) => [...prev, item]);
      } catch {
        // ignore
      }
    },
    [slug, token, guestId]
  );

  const updateCartItemQuantity = useCallback(
    async (itemId: number, quantity: number) => {
      if (!guestId) return;
      try {
        const res = await fetch(`/api/r/${slug}/session/${token}/cart/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity, guestId }),
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
    [slug, token, guestId]
  );

  const removeCartItem = useCallback(
    async (itemId: number) => {
      if (!guestId) return;
      try {
        const res = await fetch(`/api/r/${slug}/session/${token}/cart/${itemId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guestId }),
        });
        if (!res.ok) return;
        setCartItems((prev) => prev.filter((i) => i.id !== itemId));
      } catch {
        // ignore
      }
    },
    [slug, token, guestId]
  );

  const submitMyOrder = useCallback(async () => {
    if (!guestId) return;
    try {
      const res = await fetch(`/api/r/${slug}/session/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId }),
      });
      if (res.ok) await refreshCart();
    } catch {
      // ignore
    }
  }, [slug, token, guestId, refreshCart]);

  const value: OrderSessionContextValue = {
    slug,
    token,
    expiresAt,
    label,
    guestId,
    cartItems,
    orderedItems,
    setCartItems,
    addToCart,
    updateCartItemQuantity,
    removeCartItem,
    submitMyOrder,
    refreshCart,
  };

  return (
    <OrderSessionContext.Provider value={value}>
      {children}
    </OrderSessionContext.Provider>
  );
}
