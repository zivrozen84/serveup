"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const SIZE = 28;
const DURATION_MS = 520;

/** דיסקית מזון שעפה מתמונת המנה אל אייקון העגלה */
export function FlyingFoodDisc({
  from,
  to,
  onComplete,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  onComplete: () => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      setStarted(true);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!started) return;
    const t = setTimeout(() => {
      onCompleteRef.current();
    }, DURATION_MS);
    return () => clearTimeout(t);
  }, [started]);

  const half = SIZE / 2;
  const style: React.CSSProperties = {
    position: "fixed",
    left: started ? to.x - half : from.x - half,
    top: started ? to.y - half : from.y - half,
    width: SIZE,
    height: SIZE,
    borderRadius: "50%",
    background: "linear-gradient(145deg, #b45309 0%, #92400e 50%, #78350f 100%)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
    pointerEvents: "none",
    zIndex: 99999,
    transition: `left ${DURATION_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94), top ${DURATION_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
  };

  const node = (
    <div ref={elRef} style={style} aria-hidden>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 6,
          height: 6,
          marginTop: -3,
          marginLeft: -3,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.25)",
        }}
      />
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}
