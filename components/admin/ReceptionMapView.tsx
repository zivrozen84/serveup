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

// גודל שולחן באחוזים מהמפה (עורך מפה נשאר 100%; כאן קבלה – 94%)
const TABLE_SCALE = 0.94;
function tableSizePercent(t: Table) {
  const door = isDoor(t);
  const circle = t.shape === "circle";
  if (door) return { w: 7.5 * TABLE_SCALE, h: 3.2 * TABLE_SCALE };
  if (circle) return { w: 7 * TABLE_SCALE, h: 11.2 * TABLE_SCALE };
  return { w: 8 * TABLE_SCALE, h: 9.6 * TABLE_SCALE };
}

interface ReceptionMapViewProps {
  tables: Table[];
  primaryColor: string;
  selectedTableId: number | null;
  onSelectTable: (tableId: number | null) => void;
  ordersCountByTableId?: Record<number, number>;
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
  ordersAlertTableIds,
  ordersCallingWaiterTableIds,
}: ReceptionMapViewProps) {
  return (
    <div
      className="relative w-full rounded-xl border border-white/10 bg-[#1a1d24] overflow-hidden"
      style={{ aspectRatio: "800 / 500" }}
    >
      {tables.map((t) => {
        const px = t.positionX ?? 50;
        const py = t.positionY ?? 50;
        const circle = t.shape === "circle";
        const door = isDoor(t);
        const label = t.label || String(t.tableNumber);
        const hasOrders = (ordersCountByTableId[t.id] ?? 0) > 0;
        const isCallingWaiter = !door && ordersCallingWaiterTableIds?.has(t.id);
        const isAlert = !door && hasOrders && !isCallingWaiter && ordersAlertTableIds?.has(t.id);
        const selected = selectedTableId === t.id;
        const size = tableSizePercent(t);

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
              left: `${px}%`,
              top: `${py}%`,
              transform: "translate(-50%, -50%)",
              width: `${size.w}%`,
              height: `${size.h}%`,
              minWidth: "24px",
              minHeight: "24px",
            }}
          >
            <div
                className={`relative w-full h-full flex flex-col items-center justify-center text-white font-bold border-2 text-[clamp(8px,1.8vw,14px)] leading-tight ${
                  selected ? "ring-2 ring-white ring-offset-1 ring-offset-[#1a1d24]" : ""
                } ${
                  isCallingWaiter
                    ? "shadow-lg shadow-amber-400/50 bg-amber-500"
                    : !door && hasOrders
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
              {!door && hasOrders && !isCallingWaiter && (
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
              <span className={door ? "text-transparent" : ""}>{door ? "" : label || "?"}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
