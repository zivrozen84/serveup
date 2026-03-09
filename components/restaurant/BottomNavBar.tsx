"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";

const ROW_HEIGHT = 56; // גובה שורת העיגולים (בלי מסגרת)
const SIDE_ICONS_RAISE_PX = 18; // הרמת העיגולים בצדדים (משולש)
const PEEK_VISIBLE_RATIO = 0.23; // במצב מוסתר – 23% גלוי כדי שאפשר יהיה להקפיץ חזרה למעלה
const TOTAL_BAR_HEIGHT = SIDE_ICONS_RAISE_PX + ROW_HEIGHT; // גובה ויזואלי מלא (עיגולי צד מורמים + שורה)
const PEEK_OFFSET = Math.round(TOTAL_BAR_HEIGHT * (1 - PEEK_VISIBLE_RATIO)); // החלקה למטה עד ש־15% מכל הפס נראה
const SLIDE_DURATION_MS = 420; // החלקה כמו אצבע – איטית וחלקה
const DRAG_SNAP_THRESHOLD = 18; // רק בשחרור: החלטה אם לסגור או לפתוח (לא במהלך הגרירה)
const CIRCLE_SIZE = 48;
const CIRCLE_OPACITY = 0.75;
const OUTER_RING_PX = 2.5; // מסגרת צבעונית אחרי השחורה
const CIRCLES_DROP_PX = 4; // הורדה קלה של כל העיגולים (אותה כמות)
const TOP_PADDING_PX = SIDE_ICONS_RAISE_PX + OUTER_RING_PX + 4; // מקום למעלה כדי שהמסגרת לא תיחתך

function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace(/^#/, "");
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface BottomNavBarProps {
  /** צבע מילוי העיגולים (המסגרת השחורה קבועה) */
  fillColor: string;
  /** צבע האייקונים בתוך העיגולים */
  iconColor: string;
  visible?: boolean;
  onBellClick?: () => void;
  onCartClick?: () => void;
  onChatClick?: () => void;
  /** כמות פריטים בעגלה (טרמינל) – מוצגת כתג */
  cartItemsCount?: number;
  /** תווית לעיגול האמצעי (למשל "סיכום הזמנה") */
  cartLabel?: string;
  /** כשמוגדר – העיגול האמצעי הוא לינק לסיכום (תמיד מוביל לדף גם במצב peek) */
  cartHref?: string;
  /** ref לעיגול העגלה – לאנימציית עף לעגלה */
  cartCircleRef?: React.RefObject<HTMLSpanElement | null>;
}

function ChatIcon({ className, color }: { className?: string; color: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CartIcon({ className, color }: { className?: string; color: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function BellIcon({ className, color }: { className?: string; color: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

type PressedCircle = "bell" | "cart" | "chat" | null;

export function BottomNavBar({ fillColor, iconColor, visible = true, onBellClick, onCartClick, onChatClick, cartItemsCount = 0, cartLabel, cartHref, cartCircleRef }: BottomNavBarProps) {
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [pressedCircle, setPressedCircle] = useState<PressedCircle>(null);
  const startYRef = useRef(0);
  const startOffsetRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartedInPeekRef = useRef(false);

  const isPeek = offsetY > 0;
  const sideCircleRaisePx = SIDE_ICONS_RAISE_PX * (1 - offsetY / PEEK_OFFSET);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startOffsetRef.current = offsetY;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [offsetY]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dy = e.clientY - startYRef.current;
    const newOffset = Math.max(0, Math.min(PEEK_OFFSET, startOffsetRef.current + dy));
    setOffsetY(newOffset);
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    setIsDragging(false);
    setPressedCircle(null);
    const current = offsetY;
    const snapToPeek = current > PEEK_OFFSET * 0.5;
    setOffsetY(snapToPeek ? PEEK_OFFSET : 0);
  }, [offsetY]);

  const circlePressScale = 0.85;
  const isPressed = (id: PressedCircle) => pressedCircle === id;

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className="shrink-0 overflow-hidden select-none"
      style={{ height: TOTAL_BAR_HEIGHT, paddingTop: TOP_PADDING_PX, paddingLeft: OUTER_RING_PX + 4, paddingRight: OUTER_RING_PX + 4, boxSizing: "content-box" }}
      aria-hidden
    >
      <div
        className={`flex items-center justify-center gap-1 w-full pointer-events-auto cursor-grab active:cursor-grabbing ${!isDragging ? "transition-transform ease-in-out" : ""}`}
        style={{
          height: ROW_HEIGHT,
          minHeight: ROW_HEIGHT,
          transform: `translateY(${offsetY}px)`,
          transition: isDragging ? "none" : `transform ${SLIDE_DURATION_MS}ms ease-in-out`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        role="presentation"
      >
        <div
          style={{
            transform: `translateY(${-sideCircleRaisePx + CIRCLES_DROP_PX}px)`,
            transition: isDragging ? "none" : `transform ${SLIDE_DURATION_MS}ms ease-in-out`,
          }}
        >
        <div
          className="rounded-full flex items-center justify-center cursor-pointer touch-manipulation"
          role="button"
          tabIndex={0}
          title="התראות"
          style={{
            width: CIRCLE_SIZE,
            height: CIRCLE_SIZE,
            border: "3px solid black",
            backgroundColor: hexToRgba(fillColor, CIRCLE_OPACITY),
            boxShadow: `0 0 0 ${OUTER_RING_PX}px ${fillColor}, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`,
            transform: isPressed("bell") ? `scale(${circlePressScale})` : "scale(1)",
            filter: isPressed("bell") ? "brightness(0.75)" : "brightness(1)",
            transition: "transform 0.15s ease-out, filter 0.15s ease-out",
          }}
          onPointerDown={(e) => {
            if (isPeek) {
              e.stopPropagation();
              touchStartedInPeekRef.current = true;
              requestAnimationFrame(() => setOffsetY(0));
              return;
            }
            e.stopPropagation();
            setPressedCircle("bell");
          }}
          onPointerUp={(e) => {
            (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
            if (touchStartedInPeekRef.current) {
              touchStartedInPeekRef.current = false;
              setPressedCircle(null);
              return;
            }
            setPressedCircle(null);
            onBellClick?.();
          }}
          onPointerLeave={(e) => {
            (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
            if (touchStartedInPeekRef.current) touchStartedInPeekRef.current = false;
            setPressedCircle(null);
          }}
        >
          <BellIcon className="w-6 h-6" color={iconColor} />
        </div>
        </div>
        <span ref={cartCircleRef} className="shrink-0 inline-block">
        {cartHref ? (
          <Link
            href={cartHref}
            className="rounded-full flex items-center justify-center cursor-pointer touch-manipulation shrink-0 no-underline"
            role="button"
            title={cartLabel || "סיכום הזמנה"}
            style={{
              width: CIRCLE_SIZE,
              height: CIRCLE_SIZE,
              border: "3px solid black",
              backgroundColor: hexToRgba(fillColor, CIRCLE_OPACITY),
              boxShadow: `0 0 0 ${OUTER_RING_PX}px ${fillColor}, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`,
              transform: `translateY(${CIRCLES_DROP_PX}px)`,
              transition: "transform 0.15s ease-out, filter 0.15s ease-out",
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="relative inline-block pointer-events-none">
              <CartIcon className="w-6 h-6" color={iconColor} />
              {cartItemsCount > 0 && (
                <span
                  key={cartItemsCount}
                  className="cart-badge-pop absolute -top-2.5 -right-2 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center px-0.5"
                  aria-label={cartLabel ? `${cartItemsCount} פריטים ב${cartLabel}` : `${cartItemsCount} פריטים בעגלה`}
                >
                  {cartItemsCount > 99 ? "99+" : cartItemsCount}
                </span>
              )}
            </span>
          </Link>
        ) : (
          <div
            className="rounded-full flex items-center justify-center cursor-pointer touch-manipulation"
            role="button"
            tabIndex={0}
            title={cartLabel || "עגלה"}
            style={{
              width: CIRCLE_SIZE,
              height: CIRCLE_SIZE,
              border: "3px solid black",
              backgroundColor: hexToRgba(fillColor, CIRCLE_OPACITY),
              boxShadow: `0 0 0 ${OUTER_RING_PX}px ${fillColor}, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`,
              transform: `translateY(${CIRCLES_DROP_PX}px)${isPressed("cart") ? ` scale(${circlePressScale})` : ""}`,
              filter: isPressed("cart") ? "brightness(0.75)" : undefined,
              transition: "transform 0.15s ease-out, filter 0.15s ease-out",
            }}
            onPointerDown={(e) => {
              if (isPeek) {
                e.stopPropagation();
                touchStartedInPeekRef.current = true;
                requestAnimationFrame(() => setOffsetY(0));
                if (onCartClick) onCartClick();
                return;
              }
              setPressedCircle("cart");
            }}
            onPointerUp={(e) => {
              (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
              if (touchStartedInPeekRef.current) {
                touchStartedInPeekRef.current = false;
                setPressedCircle(null);
                return;
              }
              setPressedCircle(null);
              onCartClick?.();
            }}
            onPointerLeave={(e) => {
              (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
              if (touchStartedInPeekRef.current) touchStartedInPeekRef.current = false;
              setPressedCircle(null);
            }}
          >
            <span className="relative inline-block">
              <CartIcon className="w-6 h-6" color={iconColor} />
              {cartItemsCount > 0 && (
                <span
                  key={cartItemsCount}
                  className="cart-badge-pop absolute -top-2.5 -right-2 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center px-0.5"
                  aria-label={cartLabel ? `${cartItemsCount} פריטים ב${cartLabel}` : `${cartItemsCount} פריטים בעגלה`}
                >
                  {cartItemsCount > 99 ? "99+" : cartItemsCount}
                </span>
              )}
            </span>
          </div>
        )}
        </span>
        <div
          style={{
            transform: `translateY(${-sideCircleRaisePx + CIRCLES_DROP_PX}px)`,
            transition: isDragging ? "none" : `transform ${SLIDE_DURATION_MS}ms ease-in-out`,
          }}
        >
        <div
          className="rounded-full flex items-center justify-center cursor-pointer touch-manipulation"
          role="button"
          tabIndex={0}
          title="צ'אט"
          style={{
            width: CIRCLE_SIZE,
            height: CIRCLE_SIZE,
            border: "3px solid black",
            backgroundColor: hexToRgba(fillColor, CIRCLE_OPACITY),
            boxShadow: `0 0 0 ${OUTER_RING_PX}px ${fillColor}, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`,
            transform: isPressed("chat") ? `scale(${circlePressScale})` : "scale(1)",
            filter: isPressed("chat") ? "brightness(0.75)" : "brightness(1)",
            transition: "transform 0.15s ease-out, filter 0.15s ease-out",
          }}
          onPointerDown={(e) => {
            if (isPeek) {
              e.stopPropagation();
              touchStartedInPeekRef.current = true;
              requestAnimationFrame(() => setOffsetY(0));
              return;
            }
            setPressedCircle("chat");
          }}
          onPointerUp={(e) => {
            (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
            if (touchStartedInPeekRef.current) {
              touchStartedInPeekRef.current = false;
              setPressedCircle(null);
              return;
            }
            setPressedCircle(null);
            onChatClick?.();
          }}
          onPointerLeave={(e) => {
            (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
            if (touchStartedInPeekRef.current) touchStartedInPeekRef.current = false;
            setPressedCircle(null);
          }}
        >
          <ChatIcon className="w-6 h-6" color={iconColor} />
        </div>
        </div>
      </div>
    </div>
  );
}
