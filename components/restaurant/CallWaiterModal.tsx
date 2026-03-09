"use client";

import { createPortal } from "react-dom";

const CIRCLE_SIZE = 72;
const BELL_OPACITY = 0.75;

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace(/^#/, "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function BellIcon({ className, color }: { className?: string; color: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

interface CallWaiterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fillColor: string;
  iconColor: string;
  onCallWaiter: () => void;
}

export function CallWaiterModal({
  open,
  onOpenChange,
  fillColor,
  iconColor,
  onCallWaiter,
}: CallWaiterModalProps) {
  if (!open || typeof document === "undefined") return null;

  const handleBellClick = () => {
    onCallWaiter();
    onOpenChange(false);
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[150] bg-black/50"
        aria-hidden
        onClick={() => onOpenChange(false)}
      />
      <div
        className="fixed inset-0 z-[151] flex items-center justify-center p-6 pointer-events-none"
        role="dialog"
        aria-label="קריאה למלצר"
      >
        <div
          className="pointer-events-auto rounded-2xl border-2 border-white/20 bg-[#1a1d24] shadow-2xl p-8 flex flex-col items-center gap-6 min-w-[260px] max-w-[90vw]"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleBellClick}
            className="rounded-full flex items-center justify-center cursor-pointer touch-manipulation transition-transform active:scale-95 hover:scale-105"
            style={{
              width: CIRCLE_SIZE,
              height: CIRCLE_SIZE,
              border: "3px solid black",
              backgroundColor: hexToRgba(fillColor, BELL_OPACITY),
              boxShadow: "0 0 0 2.5px " + fillColor + ", 0 20px 25px -5px rgb(0 0 0 / 0.2)",
            }}
            aria-label="קרא למלצר"
          >
            <BellIcon className="w-9 h-9" color={iconColor} />
          </button>
          <p className="text-white/90 text-center text-sm font-medium leading-relaxed">
            לחץ על הפעמון כדי לקרוא למלצר
          </p>
        </div>
      </div>
    </>,
    document.body
  );
}
