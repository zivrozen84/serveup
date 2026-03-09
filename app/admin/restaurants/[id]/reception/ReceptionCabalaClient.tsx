"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Check, Clock, Settings, X } from "lucide-react";
import { ReceptionMapView } from "@/components/admin/ReceptionMapView";

let bellAudioContextRef: AudioContext | null = null;

function getBellAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (bellAudioContextRef) return bellAudioContextRef;
  bellAudioContextRef = new Ctx();
  return bellAudioContextRef;
}

/** צליל דינג אחד – כמו פעמון קטן של טבחים. דורש אינטראקציה קודמת (לחיצה) בדף כדי לפתוח אודיו. */
function playNewOrderBell() {
  try {
    const ctx = getBellAudioContext();
    if (!ctx) return;
    const at = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 2600;
    osc.type = "sine";
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.25, at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.008, at + 0.22);
    osc.start(at);
    osc.stop(at + 0.22);
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  } catch {
    // ignore
  }
}

/** צליל התראת זמן – מלחיץ, שני ביפים נמוכים */
function playAlertSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const playBeep = (at: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 400;
      osc.type = "square";
      gain.gain.setValueAtTime(0.2, at);
      gain.gain.exponentialRampToValueAtTime(0.01, at + 0.2);
      osc.start(at);
      osc.stop(at + 0.2);
    };
    playBeep(ctx.currentTime);
    playBeep(ctx.currentTime + 0.25);
  } catch {
    // ignore
  }
}

type OrderItem = {
  id: number;
  dishTitle: string;
  quantity: number;
  priceCents: number;
  selections: unknown;
};

type SubmissionDto = {
  id: number;
  guestId: string;
  submittedAt: string;
  status: string;
  session: {
    id: number;
    token: string;
    label: string | null;
    tableId: number | null;
    table: { id: number; tableNumber: number; label: string | null } | null;
  };
  items: OrderItem[];
};

type Table = {
  id: number;
  tableNumber: number;
  label: string | null;
  positionX: number | null;
  positionY: number | null;
  shape: string | null;
};

const POLL_MS = 8000;
const BON_GROUP_MINUTES = 10;

/** קבוצת הזמנות לאיחוד בון אחד: אותו שולחן, עד 10 דקות בין ההזמנות */
type BonGroup = {
  tableLabel: string;
  submissions: SubmissionDto[];
};

function buildBonGroups(orders: SubmissionDto[]): BonGroup[] {
  const sorted = [...orders].sort(
    (a, b) =>
      (a.session.tableId ?? 0) - (b.session.tableId ?? 0) ||
      new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
  );
  const groups: BonGroup[] = [];
  const tenMinMs = BON_GROUP_MINUTES * 60 * 1000;

  for (const sub of sorted) {
    const tableId = sub.session.tableId;
    const tableLabel =
      sub.session.table?.label ?? sub.session.table?.tableNumber ?? sub.session.label ?? "—";
    const subTime = new Date(sub.submittedAt).getTime();

    const last = groups[groups.length - 1];
    if (
      last &&
      last.submissions[0]?.session.tableId === tableId &&
      subTime - new Date(last.submissions[last.submissions.length - 1].submittedAt).getTime() <= tenMinMs
    ) {
      last.submissions.push(sub);
    } else {
      groups.push({ tableLabel, submissions: [sub] });
    }
  }
  return groups;
}

/** מחזיר שורת טקסט להצגת פרמטרים (בחירות) מפריט */
function formatSelections(selections: unknown): string {
  if (!selections || !Array.isArray(selections)) return "";
  const parts = (selections as Array<{ parameterName?: string; paramCategoryName?: string; priceCents?: number }>)
    .map((s) => {
      const name = s.parameterName ?? s.paramCategoryName ?? "";
      if (!name) return "";
      const extra = s.priceCents != null && s.priceCents > 0 ? ` (+₪${(s.priceCents / 100).toFixed(0)})` : "";
      return name + extra;
    })
    .filter(Boolean);
  return parts.join(", ");
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" });
}

/** זמן שעבר מאז submittedAt בפורמט M:SS, מתעדכן כל שניה */
function useElapsedDisplay(submittedAt: string): { elapsedSec: number; display: string } {
  const submittedMs = useMemo(() => new Date(submittedAt).getTime(), [submittedAt]);
  const getElapsed = useCallback(() => Math.floor((Date.now() - submittedMs) / 1000), [submittedMs]);
  const toDisplay = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const [display, setDisplay] = useState(() => toDisplay(getElapsed()));

  useEffect(() => {
    const tick = () => setDisplay(toDisplay(getElapsed()));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [getElapsed]);

  const elapsedSec = getElapsed();
  return { elapsedSec, display };
}

function BonTimer({
  submittedAt,
  alertAfterMinutes,
}: {
  submittedAt: string;
  alertAfterMinutes?: number | null;
}) {
  const { elapsedSec, display } = useElapsedDisplay(submittedAt);
  const thresholdSec = (alertAfterMinutes != null ? alertAfterMinutes : 10) * 60;
  const isAlert = elapsedSec > thresholdSec;
  return (
    <span
      className={`tabular-nums font-bold ${isAlert ? "text-red-400" : "text-white"}`}
      title={`לפני ${display}`}
    >
      {display}
    </span>
  );
}

interface ReceptionCabalaClientProps {
  restaurantId: number;
  restaurantName: string;
  primaryColor: string;
  tables: Table[];
  initialDontNotify: boolean;
  initialAutoDeleteMinutes: number;
  initialAlertAfterMinutes: number;
}

export function ReceptionCabalaClient({
  restaurantId,
  restaurantName,
  primaryColor,
  tables,
  initialDontNotify,
  initialAutoDeleteMinutes,
  initialAlertAfterMinutes,
}: ReceptionCabalaClientProps) {
  const [orders, setOrders] = useState<SubmissionDto[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [dontNotify, setDontNotify] = useState(initialDontNotify);
  const [autoDeleteMinutes, setAutoDeleteMinutes] = useState(initialAutoDeleteMinutes);
  const [alertAfterMinutes, setAlertAfterMinutes] = useState(initialAlertAfterMinutes);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [markingGroupIds, setMarkingGroupIds] = useState<Set<number>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const prevOrderCountRef = useRef<number>(0);
  const prevSubmissionIdsRef = useRef<Set<number>>(new Set());
  const isFirstLoadRef = useRef(true);
  const bellUnlockedRef = useRef(false);
  useEffect(() => {
    if (bellUnlockedRef.current) return;
    const unlock = () => {
      if (bellUnlockedRef.current) return;
      bellUnlockedRef.current = true;
      const ctx = getBellAudioContext();
      if (ctx?.state === "suspended") ctx.resume().catch(() => {});
    };
    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);
  const alertSoundPlayedRef = useRef<Set<number>>(new Set());
  const [tick, setTick] = useState(0);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const [settingsPopoverRect, setSettingsPopoverRect] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!settingsOpen || !settingsButtonRef.current) {
      setSettingsPopoverRect(null);
      return;
    }
    const rect = settingsButtonRef.current.getBoundingClientRect();
    setSettingsPopoverRect({ top: rect.bottom + 6, left: rect.left });
  }, [settingsOpen]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/restaurants/${restaurantId}/reception/orders`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        const count = list.length;
        const newIds = new Set(list.map((o: { id: number }) => o.id));
        const prevIds = prevSubmissionIdsRef.current;
        const hasNewSubmission = [...newIds].some((id) => !prevIds.has(id));
        if (!isFirstLoadRef.current && hasNewSubmission) {
          playNewOrderBell();
        }
        isFirstLoadRef.current = false;
        prevOrderCountRef.current = count;
        prevSubmissionIdsRef.current = newIds;
        setOrders(list);
      }
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const fetchSettings = useCallback(async () => {
    const res = await fetch(
      `/api/admin/restaurants/${restaurantId}/reception/settings`,
      { credentials: "include" }
    );
    if (res.ok) {
      const data = await res.json();
      setDontNotify(data.receptionDontNotifyReady ?? false);
      setAutoDeleteMinutes(data.receptionAutoDeleteMinutes ?? 30);
      setAlertAfterMinutes(data.receptionAlertAfterMinutes ?? 10);
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchOrders();
    const t = setInterval(fetchOrders, POLL_MS);
    return () => clearInterval(t);
  }, [fetchOrders]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const alertThresholdSec = alertAfterMinutes != null ? alertAfterMinutes * 60 : null;
  useEffect(() => {
    if (alertThresholdSec == null || orders.length === 0) return;
    const tick = () => {
      const now = Date.now();
      orders.forEach((sub) => {
        const elapsed = Math.floor((now - new Date(sub.submittedAt).getTime()) / 1000);
        if (elapsed > alertThresholdSec && !alertSoundPlayedRef.current.has(sub.id)) {
          alertSoundPlayedRef.current.add(sub.id);
          playAlertSound();
        }
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [orders, alertThresholdSec]);

  const filteredOrders =
    selectedTableId == null
      ? orders
      : orders.filter((o) => o.session.tableId === selectedTableId);

  /** בונים מאוחדים: אותו שולחן עד 10 דקות = בון אחד */
  const bonGroups = useMemo(() => buildBonGroups(orders), [orders]);
  /** סדר תצוגה: ישן משמאל, חדש מימין (לפי זמן ההזמנה הראשונה בקבוצה) */
  const bonGroupsLeftToRight = useMemo(
    () => [...bonGroups].sort(
      (a, b) =>
        new Date(a.submissions[0].submittedAt).getTime() -
        new Date(b.submissions[0].submittedAt).getTime()
    ),
    [bonGroups]
  );

  const ordersCountByTableId: Record<number, number> = {};
  orders.forEach((o) => {
    const tid = o.session.tableId;
    if (tid != null) {
      ordersCountByTableId[tid] = (ordersCountByTableId[tid] ?? 0) + 1;
    }
  });

  const handleMarkReady = async (submissionId: number) => {
    setMarkingId(submissionId);
    try {
      const res = await fetch(
        `/api/admin/restaurants/${restaurantId}/reception/orders/${submissionId}`,
        { method: "PATCH", credentials: "include" }
      );
      if (res.ok) await fetchOrders();
    } finally {
      setMarkingId(null);
    }
  };

  const handleMarkGroupReady = async (submissionIds: number[]) => {
    const idSet = new Set(submissionIds);
    setMarkingGroupIds(idSet);
    try {
      await Promise.all(
        submissionIds.map((id) =>
          fetch(`/api/admin/restaurants/${restaurantId}/reception/orders/${id}`, {
            method: "PATCH",
            credentials: "include",
          })
        )
      );
      await fetchOrders();
    } finally {
      setMarkingGroupIds((prev) => {
        const next = new Set(prev);
        submissionIds.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const handleToggleDontNotify = async () => {
    const next = !dontNotify;
    setDontNotify(next);
    try {
      await fetch(`/api/admin/restaurants/${restaurantId}/reception/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receptionDontNotifyReady: next,
          receptionAutoDeleteMinutes: next ? autoDeleteMinutes : null,
        }),
        credentials: "include",
      });
    } catch {
      setDontNotify(!next);
    }
  };

  const handleAutoDeleteChange = async (val: number) => {
    const next = Math.max(1, Math.min(120, val));
    setAutoDeleteMinutes(next);
    if (dontNotify) {
      try {
        await fetch(`/api/admin/restaurants/${restaurantId}/reception/settings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receptionDontNotifyReady: true,
            receptionAutoDeleteMinutes: next,
          }),
          credentials: "include",
        });
      } catch {
        setAutoDeleteMinutes(autoDeleteMinutes);
      }
    }
  };

  const handleAlertAfterChange = async (val: number) => {
    const next = Math.max(1, Math.min(120, val));
    setAlertAfterMinutes(next);
    try {
      await fetch(`/api/admin/restaurants/${restaurantId}/reception/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receptionAlertAfterMinutes: next }),
        credentials: "include",
      });
    } catch {
      setAlertAfterMinutes(alertAfterMinutes);
    }
  };

  const ordersAlertTableIds = useMemo(() => {
    if (alertThresholdSec == null) return new Set<number>();
    const set = new Set<number>();
    const now = Date.now();
    orders.forEach((sub) => {
      const elapsed = Math.floor((now - new Date(sub.submittedAt).getTime()) / 1000);
      if (elapsed > alertThresholdSec && sub.session.tableId != null) {
        set.add(sub.session.tableId);
      }
    });
    return set;
  }, [orders, alertThresholdSec, tick]);

  const selectedTableLabel = selectedTableId != null
    ? (tables.find((t) => t.id === selectedTableId)?.label ?? tables.find((t) => t.id === selectedTableId)?.tableNumber ?? selectedTableId)
    : null;

  const tableOrders = selectedTableId != null ? filteredOrders : [];

  const isOrderAlert = (sub: SubmissionDto) => {
    if (alertThresholdSec == null) return false;
    const elapsed = Math.floor((Date.now() - new Date(sub.submittedAt).getTime()) / 1000);
    return elapsed > alertThresholdSec;
  };

  return (
    <div className="flex flex-col min-h-0 relative gap-2">
      {/* עליון: הגדרות ימין, כל ההזמנות */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="relative order-1">
          <button
            ref={settingsButtonRef}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSettingsOpen((o) => !o);
            }}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            aria-label="הגדרות"
            aria-expanded={settingsOpen}
          >
            <Settings className="w-4 h-4" />
          </button>
          {typeof document !== "undefined" &&
            settingsOpen &&
            createPortal(
              <>
                <div
                  className="fixed inset-0 z-[100]"
                  aria-hidden
                  onClick={() => setSettingsOpen(false)}
                />
                <div
                  className="fixed z-[101] min-w-[240px] rounded-lg border border-white/10 bg-[#0e1118] shadow-xl p-3"
                  style={
                    settingsPopoverRect
                      ? { top: settingsPopoverRect.top, left: settingsPopoverRect.left }
                      : undefined
                  }
                  role="dialog"
                  aria-label="הגדרות קבלה"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white text-sm font-medium">הגדרות</span>
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(false)}
                      className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10"
                      aria-label="סגור"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer text-white/80 text-xs">
                      <input
                        type="checkbox"
                        checked={dontNotify}
                        onChange={handleToggleDontNotify}
                        className="w-3.5 h-3.5 rounded border-white/30"
                      />
                      <span>אל תודיע מוכן, מחק אחרי</span>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={autoDeleteMinutes}
                        onChange={(e) => handleAutoDeleteChange(parseInt(e.target.value, 10) || 30)}
                        disabled={!dontNotify}
                        className="w-10 px-1 py-0.5 rounded bg-white/10 text-white text-center border-0 text-xs disabled:opacity-50"
                      />
                      <span>דק׳</span>
                    </label>
                    <label className="flex items-center gap-2 text-white/80 text-xs">
                      <span>התראת זמן</span>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={alertAfterMinutes}
                        onChange={(e) => handleAlertAfterChange(parseInt(e.target.value, 10) || 10)}
                        className="w-10 px-1 py-0.5 rounded bg-white/10 text-white text-center border-0 text-xs"
                      />
                      <span>דק׳</span>
                    </label>
                  </div>
                  <p className="text-white/40 text-[10px] mt-2">נשמר אוטומטית</p>
                </div>
              </>,
              document.body
            )}
        </div>
        <h2 className="text-white font-medium text-sm flex items-center gap-1.5 order-2">
          <Clock className="w-3.5 h-3.5 text-white/70" />
          כל ההזמנות
        </h2>
      </div>

      {/* בונים */}
      <div className="min-w-0 flex-1 flex flex-col min-h-0">
        {loading ? (
          <p className="text-white/50 text-xs">טוען...</p>
        ) : bonGroupsLeftToRight.length === 0 ? (
          <p className="text-white/50 text-xs">אין הזמנות ממתינות</p>
        ) : (
          <div className="flex flex-row flex-wrap gap-2 overflow-x-auto overflow-y-auto pb-1 scrollbar-hide min-w-0 flex-1 min-h-[260px] content-start">
            {bonGroupsLeftToRight.map((group) => {
              const firstSub = group.submissions[0];
              const alert = group.submissions.some(isOrderAlert);
              const ids = group.submissions.map((s) => s.id);
              const isMarking = ids.some((id) => markingGroupIds.has(id));
              return (
                <div
                  key={group.submissions.map((s) => s.id).join(",")}
                  className={`rounded-lg border p-2.5 flex flex-col gap-1.5 min-w-[200px] w-[200px] max-w-[280px] flex-shrink-0 ${
                    alert
                      ? "border-red-500/80 bg-red-950/40 shadow-lg shadow-red-500/20"
                      : "border-white/10 bg-[#1a1d24]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 min-w-0">
                    <span className="text-white/70 text-[11px] truncate">
                      שולחן {group.tableLabel}
                    </span>
                    <BonTimer submittedAt={firstSub.submittedAt} alertAfterMinutes={alertAfterMinutes} />
                  </div>
                  <p className="text-white/40 text-[10px]">{formatTime(firstSub.submittedAt)}</p>
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    {group.submissions.map((sub) => {
                      const subAlert = isOrderAlert(sub);
                      return (
                        <div key={sub.id} className="flex flex-col gap-0.5">
                          <div className="flex items-center justify-end gap-1.5 min-w-0">
                            <span
                              className={`text-[10px] tabular-nums ${
                                subAlert ? "text-red-400" : "text-white/40"
                              }`}
                            >
                              <BonTimer submittedAt={sub.submittedAt} alertAfterMinutes={alertAfterMinutes} />
                            </span>
                            <span className="text-white/35 text-[10px]">{formatTime(sub.submittedAt)}</span>
                          </div>
                          <ul className="text-white/90 text-xs space-y-1 break-words">
                            {sub.items.map((i) => (
                              <li key={i.id}>
                                <span>{i.quantity} × {i.dishTitle}</span>
                                {formatSelections(i.selections) && (
                                  <p className="text-white/60 text-xs mt-0.5 pr-1">{formatSelections(i.selections)}</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                  {!dontNotify && (
                    <div className="flex justify-end pt-1.5 mt-auto shrink-0">
                      <button
                        type="button"
                        disabled={isMarking}
                        onClick={() => handleMarkGroupReady(ids)}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-white text-[11px] font-medium"
                        style={{
                          backgroundColor: isMarking ? "#555" : "#2F7C73",
                        }}
                      >
                        <Check className="w-3 h-3" />
                        מוכן
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* מפת שולחנות – תמיד למטה */}
      <div className="shrink-0 w-full max-w-2xl self-center">
        <ReceptionMapView
          tables={tables}
          primaryColor={primaryColor}
          selectedTableId={selectedTableId}
          onSelectTable={setSelectedTableId}
          ordersCountByTableId={ordersCountByTableId}
          ordersAlertTableIds={ordersAlertTableIds}
        />
      </div>

      {/* הזמנה ספציפית – רק כשיש שולחן נבחר */}
      {selectedTableId != null && (
        <div className="rounded-lg border border-white/10 bg-[#1a1d24] p-3 shrink-0 max-w-xl">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="text-lg font-semibold text-white">שולחן {selectedTableLabel}</h2>
            <button
              type="button"
              onClick={() => setSelectedTableId(null)}
              className="text-xs text-white/50 hover:text-white shrink-0"
            >
              סגור
            </button>
          </div>
          {tableOrders.length === 0 ? (
            <p className="text-white/50 text-xs">אין הזמנות ממתינות לשולחן זה</p>
          ) : (
            <ul className="space-y-3">
              {tableOrders.map((sub) => (
                <li key={sub.id} className="border-t border-white/10 pt-2 first:border-t-0 first:pt-0">
                  <p className="text-white/60 text-[11px] mb-0.5">{formatTime(sub.submittedAt)}</p>
                  <p className="text-white/40 text-[11px] mb-1.5 tabular-nums">
                    <BonTimer submittedAt={sub.submittedAt} alertAfterMinutes={alertAfterMinutes} />
                  </p>
                  <ul className="text-white text-sm font-medium space-y-0.5">
                    {sub.items.map((i) => (
                      <li key={i.id}>
                        <span>{i.quantity} × {i.dishTitle}</span>
                        {formatSelections(i.selections) && (
                          <p className="text-white/55 text-[11px] font-normal mt-0.5">{formatSelections(i.selections)}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
