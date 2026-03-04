"use client";

import { useState, useRef, useCallback } from "react";

const ROW_HEIGHT = 56; // גובה שורת העיגולים (בלי מסגרת)
const PEEK_OFFSET = ROW_HEIGHT / 2; // כשמושכים למטה – רק חצי עליון בולט
const CIRCLE_SIZE = 48;

interface BottomNavBarProps {
  /** צבע מילוי העיגולים (המסגרת השחורה קבועה) */
  fillColor: string;
  /** צבע האייקונים בתוך העיגולים */
  iconColor: string;
  visible?: boolean;
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      style={{ height: ROW_HEIGHT }}
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
          className="rounded-full flex items-center justify-center shadow-xl border-[3px] border-black"
          style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, backgroundColor: fillColor, color: iconColor }}
          title="צ'אט"
        >
          <ChatIcon className="w-6 h-6" />
        </div>
        <div
          className="rounded-full flex items-center justify-center shadow-xl border-[3px] border-black"
          style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, backgroundColor: fillColor, color: iconColor }}
          title="עגלה"
        >
          <CartIcon className="w-6 h-6" />
        </div>
        <div
          className="rounded-full flex items-center justify-center shadow-xl border-[3px] border-black"
          style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, backgroundColor: fillColor, color: iconColor }}
          title="התראות"
        >
          <BellIcon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
