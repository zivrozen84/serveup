"use client";

import { useState, useRef, useCallback } from "react";

const ROW_HEIGHT = 56; // גובה שורת העיגולים (בלי מסגרת)
const PEEK_OFFSET = ROW_HEIGHT / 2; // כשמושכים למטה – רק חצי עליון בולט
const CIRCLE_SIZE = 48;
const CIRCLE_OPACITY = 0.75;
const OUTER_RING_PX = 2.5; // מסגרת צבעונית אחרי השחורה

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

export function BottomNavBar({ fillColor, iconColor, visible = true }: BottomNavBarProps) {
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startOffsetRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startYRef.current = e.clientY;
    startOffsetRef.current = offsetY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [offsetY]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dy = e.clientY - startYRef.current;
    const newOffset = Math.max(0, Math.min(PEEK_OFFSET, startOffsetRef.current + dy));
    setOffsetY(newOffset);
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    setIsDragging(false);
    const current = offsetY;
    const snapToPeek = current > PEEK_OFFSET * 0.5;
    setOffsetY(snapToPeek ? PEEK_OFFSET : 0);
  }, [offsetY]);

  if (!visible) return null;

  return (
    <div
      ref={containerRef}
      className="shrink-0 overflow-hidden touch-none select-none pointer-events-none"
      style={{ height: ROW_HEIGHT, paddingLeft: OUTER_RING_PX + 4, paddingRight: OUTER_RING_PX + 4, boxSizing: "content-box" }}
      aria-hidden
    >
      <div
        className={`flex items-center justify-center gap-3 w-full ${!isDragging ? "transition-transform duration-200 ease-out" : ""} pointer-events-auto cursor-grab active:cursor-grabbing`}
        style={{
          height: ROW_HEIGHT,
          minHeight: ROW_HEIGHT,
          transform: `translateY(${offsetY}px)`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        role="presentation"
      >
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: CIRCLE_SIZE,
            height: CIRCLE_SIZE,
            border: "3px solid black",
            backgroundColor: hexToRgba(fillColor, CIRCLE_OPACITY),
            boxShadow: `0 0 0 ${OUTER_RING_PX}px ${fillColor}, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`,
          }}
          title="צ'אט"
        >
          <ChatIcon className="w-6 h-6" color={iconColor} />
        </div>
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: CIRCLE_SIZE,
            height: CIRCLE_SIZE,
            border: "3px solid black",
            backgroundColor: hexToRgba(fillColor, CIRCLE_OPACITY),
            boxShadow: `0 0 0 ${OUTER_RING_PX}px ${fillColor}, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`,
          }}
          title="עגלה"
        >
          <CartIcon className="w-6 h-6" color={iconColor} />
        </div>
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: CIRCLE_SIZE,
            height: CIRCLE_SIZE,
            border: "3px solid black",
            backgroundColor: hexToRgba(fillColor, CIRCLE_OPACITY),
            boxShadow: `0 0 0 ${OUTER_RING_PX}px ${fillColor}, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`,
          }}
          title="התראות"
        >
          <BellIcon className="w-6 h-6" color={iconColor} />
        </div>
      </div>
    </div>
  );
}
