"use client";

import { Bell } from "lucide-react";

interface Table {
  id: number;
  tableNumber: number;
  label: string | null;
  positionX: number | null;
  positionY: number | null;
  shape: string | null;
}

function isDoor(t: Table) {
  return t.shape === "door" || t.label === "דלת";
}

// ריבועים אחידים – גודל קטן יותר כדי שיהיו רווחים גדולים ביניהם
const TABLE_SIZE = 6.4; // אחוזים מהמפה
function tableSizePercent(t: Table) {
  const door = isDoor(t);
  const circle = t.shape === "circle";
  if (door) return { w: 7.5, h: 3.2 };
  if (circle) return { w: TABLE_SIZE, h: TABLE_SIZE };
  return { w: TABLE_SIZE, h: TABLE_SIZE };
}

const CROP_MARGIN = 14; // רקע מסביב – ספייר גדול יותר למראה נקי

interface ReceptionMapViewProps {
  tables: Table[];
  primaryColor: string;
  selectedTableId: number | null;
  onSelectTable: (tableId: number | null) => void;
  ordersCountByTableId?: Record<number, number>;
  /** שולחנות פעילים (לא נסגר חשבון) – נקדה ירוקה גם אם הכל מוכן */
  activeTableIds?: Set<number>;
  /** שולחנות עם הזמנות שעברו את זמן ההתראה – תג אדום במקום צהוב */
  ordersAlertTableIds?: Set<number>;
  /** שולחנות שקוראים למלצר – צהוב, אפקט הגדלה, אייקון פעמון (הפופאפ מוצג בכרטיסיית השולחן) */
  ordersCallingWaiterTableIds?: Set<number>;
}

export function ReceptionMapView({
  tables,
  primaryColor,
  selectedTableId,
  onSelectTable,
  ordersCountByTableId = {},
  activeTableIds,
  ordersAlertTableIds,
  ordersCallingWaiterTableIds,
}: ReceptionMapViewProps) {
  // bounding box של כל השולחנות + ספייר – preview רק האזור הזה
  const crop = (() => {
    if (tables.length === 0) return { minX: 0, minY: 0, w: 100, h: 100 };
    let minX = 100,
      maxX = 0,
      minY = 100,
      maxY = 0;
    for (const t of tables) {
      const px = t.positionX ?? 50;
      const py = t.positionY ?? 50;
      const size = tableSizePercent(t);
      minX = Math.min(minX, px - size.w / 2);
      maxX = Math.max(maxX, px + size.w / 2);
      minY = Math.min(minY, py - size.h / 2);
      maxY = Math.max(maxY, py + size.h / 2);
    }
    minX = Math.max(0, minX - CROP_MARGIN);
    maxX = Math.min(100, maxX + CROP_MARGIN);
    minY = Math.max(0, minY - CROP_MARGIN);
    maxY = Math.min(100, maxY + CROP_MARGIN);
    const w = Math.max(maxX - minX, 20);
    const h = Math.max(maxY - minY, 20);
    return { minX, minY, w, h };
  })();

  return (
    <div
      className="relative w-full rounded-xl border border-white/10 bg-[#1a1d24] overflow-hidden"
      style={{ aspectRatio: `${crop.w} / ${crop.h}` }}
    >
      {tables.map((t) => {
        const px = t.positionX ?? 50;
        const py = t.positionY ?? 50;
        const circle = t.shape === "circle";
        const door = isDoor(t);
        const label = t.label || String(t.tableNumber);
        const isActive = !door && (activeTableIds?.has(t.id) ?? false);
        const pendingCount = ordersCountByTableId[t.id] ?? 0;
        const hasOrders = pendingCount > 0;
        const isCallingWaiter = !door && ordersCallingWaiterTableIds?.has(t.id);
        const isAlert = !door && hasOrders && !isCallingWaiter && ordersAlertTableIds?.has(t.id);
        const selected = selectedTableId === t.id;
        const size = tableSizePercent(t);
        // מיקום וגודל במערכת הקרופ: 0–100% בתוך המלבן של השולחנות+ספייר
        const leftCrop = ((px - crop.minX) / crop.w) * 100;
        const topCrop = ((py - crop.minY) / crop.h) * 100;
        const widthCrop = (size.w / crop.w) * 100;
        const heightCrop = (size.h / crop.h) * 100;

        const handleClick = () => {
          if (door) return;
          onSelectTable(selectedTableId === t.id ? null : t.id);
        };

        return (
          <button
            key={t.id}
            type="button"
            onClick={handleClick}
            className={`absolute flex flex-col items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-white/50 rounded-lg ${
              isCallingWaiter ? "animate-waiter-call hover:scale-110" : "hover:scale-105"
            }`}
            style={{
              left: `${leftCrop}%`,
              top: `${topCrop}%`,
              transform: "translate(-50%, -50%)",
              width: `${widthCrop}%`,
              height: `${heightCrop}%`,
              minWidth: "24px",
              minHeight: "24px",
            }}
          >
            <div
                className={`relative w-full h-full flex flex-col items-center justify-center text-white font-bold border-2 leading-tight ${
                  selected ? "ring-2 ring-white ring-offset-1 ring-offset-[#1a1d24]" : ""
                }                 ${
                  isCallingWaiter
                    ? "shadow-lg shadow-amber-400/50 bg-amber-500"
                    : !door && (hasOrders || isActive)
                      ? isAlert
                        ? "shadow-lg shadow-red-500/40"
                        : "shadow-lg shadow-amber-500/30"
                      : ""
                }`}
                style={{
                  backgroundColor: door ? "#ffffff" : isCallingWaiter ? "#eab308" : primaryColor,
                  borderRadius: circle ? "50%" : door ? "4px" : "8px",
                }}
              >
                {isCallingWaiter && (
                  <span
                    className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full w-5 h-5 flex items-center justify-center rounded-full bg-amber-400 text-[#1a1d24] z-10"
                    aria-hidden
                    title="קורא למלצר"
                  >
                    <Bell className="w-2.5 h-2.5" strokeWidth={2.5} />
                  </span>
                )}
              {!door && isActive && !isCallingWaiter && (
                <span
                  className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-pulse border border-[#1a1d24] z-10"
                  aria-hidden
                  title="שולחן פעיל"
                />
              )}
              {!door && hasOrders && !isCallingWaiter && (
                <span
                  className={`absolute -top-[2px] -right-[2px] min-w-[14px] h-3.5 px-0.5 rounded-full text-white text-[9px] font-bold flex items-center justify-center border border-[#1a1d24] z-10 leading-none ${
                    isAlert ? "bg-red-500" : "bg-amber-500"
                  }`}
                  aria-hidden
                >
                  {ordersCountByTableId[t.id]}
                </span>
              )}
              <span
                className={door ? "text-transparent" : ""}
                style={{ fontSize: "36px" }}
              >
                {door ? "" : label || "?"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
