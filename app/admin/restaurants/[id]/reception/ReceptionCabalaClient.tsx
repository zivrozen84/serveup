"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Bell, Check, Clock, Printer, Settings, X } from "lucide-react";
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

/** צליל קריאה למלצר – צלצול פעמון חוזר כ־5 שניות */
function playWaiterCallRing() {
  try {
    const ctx = getBellAudioContext();
    if (!ctx) return;
    const duration = 5;
    const at = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 1200;
    osc.type = "sine";
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(0.2, at + 0.05);
    let t = at + 0.05;
    while (t < at + duration) {
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.02, t + 0.15);
      gain.gain.setValueAtTime(0.02, t + 0.4);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.45);
      t += 0.6;
    }
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration + 0.2);
    osc.start(at);
    osc.stop(at + duration + 0.3);
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
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
  status?: string;
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
    const trimmed = sub.session.table?.label?.trim();
    const tableLabel =
      (trimmed && trimmed !== "שולחן" ? trimmed : (sub.session.table?.tableNumber != null ? String(sub.session.table.tableNumber) : null)) ?? sub.session.label ?? "—";
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

function formatPrice(cents: number): string {
  const n = cents / 100;
  return n % 1 === 0 ? n.toString() : n.toFixed(2);
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
  const thresholdSec = alertAfterMinutes != null && alertAfterMinutes > 0 ? alertAfterMinutes * 60 : Infinity;
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

/** טיימר ליד מנה: לא מוכן = רץ, מוכן = זמן קפוא (submittedAt→readyAt), בוטל = בלי טיימר */
function ItemTimer({ status, submittedAt, readyAt }: { status: string; submittedAt?: string; readyAt?: string | null }) {
  if (status === "canceled") return null;
  if (status === "ready" && submittedAt && readyAt) {
    const sub = new Date(submittedAt).getTime();
    const ready = new Date(readyAt).getTime();
    const sec = Math.floor((ready - sub) / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const display = `${m}:${s.toString().padStart(2, "0")}`;
    return <span className="text-white/70 text-[10px] tabular-nums" title={`זמן הכנה: ${display}`}>{display}</span>;
  }
  if (status === "ready") return null;
  if (!submittedAt) return null;
  const { display } = useElapsedDisplay(submittedAt);
  return <span className="text-white/70 text-[10px] tabular-nums" title={`זמן מההזמנה: ${display}`}>{display}</span>;
}

interface ReceptionCabalaClientProps {
  restaurantId: number;
  restaurantName: string;
  primaryColor: string;
  tables: Table[];
  initialDontNotify: boolean;
  initialAutoDeleteMinutes: number;
  initialAlertAfterMinutes: number | null;
  initialWaiterPopupDisabled: boolean;
}

export function ReceptionCabalaClient({
  restaurantId,
  restaurantName,
  primaryColor,
  tables,
  initialDontNotify,
  initialAutoDeleteMinutes,
  initialAlertAfterMinutes,
  initialWaiterPopupDisabled,
}: ReceptionCabalaClientProps) {
  const [orders, setOrders] = useState<SubmissionDto[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [dontNotify, setDontNotify] = useState(initialDontNotify);
  const [autoDeleteMinutes, setAutoDeleteMinutes] = useState(initialAutoDeleteMinutes);
  const [alertAfterMinutes, setAlertAfterMinutes] = useState(initialAlertAfterMinutes);
  const [waiterPopupDisabled, setWaiterPopupDisabled] = useState(initialWaiterPopupDisabled);
  const [callingWaiterTables, setCallingWaiterTables] = useState<Array<{ tableId: number; label: string }>>([]);
  type TableSummaryRow = {
    tableId: number;
    tableLabel: string;
    items: { itemId: number; dishTitle: string; quantity: number; priceCents: number; lineTotalCents: number; status: string; selections?: unknown; submittedAt?: string; readyAt?: string | null }[];
    totalCents: number;
  };
  const [tableSummary, setTableSummary] = useState<TableSummaryRow[]>([]);
  const [closeTableConfirmTableId, setCloseTableConfirmTableId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [markingGroupIds, setMarkingGroupIds] = useState<Set<number>>(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const TEXT_SCALE_KEY = `serveup_reception_textScale_${restaurantId}`;
  const [textScale, setTextScale] = useState(1);
  useEffect(() => {
    try {
      const s = localStorage.getItem(TEXT_SCALE_KEY);
      if (s != null) {
        const n = parseFloat(s);
        if (Number.isFinite(n) && n >= 0.8 && n <= 1.4) setTextScale(n);
      }
    } catch {
      // ignore
    }
  }, [TEXT_SCALE_KEY]);
  const handleTextScaleChange = useCallback(
    (value: number) => {
      setTextScale(value);
      try {
        localStorage.setItem(TEXT_SCALE_KEY, String(value));
      } catch {
        // ignore
      }
    },
    [TEXT_SCALE_KEY]
  );
  const prevOrderCountRef = useRef<number>(0);
  const prevSubmissionIdsRef = useRef<Set<number>>(new Set());
  const prevOrderTableIdsRef = useRef<Set<number>>(new Set());
  const prevCallingTableIdsRef = useRef<Set<number>>(new Set());
  const isFirstCallingLoadRef = useRef(true);
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
      setAlertAfterMinutes(data.receptionAlertAfterMinutes !== undefined ? data.receptionAlertAfterMinutes : 10);
      setWaiterPopupDisabled(data.receptionWaiterPopupDisabled ?? false);
    }
  }, [restaurantId]);

  const fetchCallingWaiter = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/restaurants/${restaurantId}/reception/calling-waiter`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        const tables = (data.tables ?? []) as Array<{ tableId: number; label: string; tableNumber: number }>;
        const newTables = tables.map((t) => ({ tableId: t.tableId, label: t.label ?? String(t.tableNumber) }));
        const newIds = new Set(newTables.map((t) => t.tableId));
        const prevIds = prevCallingTableIdsRef.current;
        const hasNewCalling = !isFirstCallingLoadRef.current && newTables.some((t) => !prevIds.has(t.tableId));
        if (hasNewCalling) {
          playWaiterCallRing();
        }
        isFirstCallingLoadRef.current = false;
        prevCallingTableIdsRef.current = newIds;
        setCallingWaiterTables(newTables);
      }
    } catch {
      // ignore
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchOrders();
    const t = setInterval(fetchOrders, POLL_MS);
    return () => clearInterval(t);
  }, [fetchOrders]);

  useEffect(() => {
    fetchCallingWaiter();
    const t = setInterval(fetchCallingWaiter, POLL_MS);
    return () => clearInterval(t);
  }, [fetchCallingWaiter]);

  const fetchTableSummary = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/restaurants/${restaurantId}/reception/table-summary`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setTableSummary(data.tables ?? []);
      }
    } catch {
      // ignore
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchTableSummary();
    const t = setInterval(fetchTableSummary, POLL_MS);
    return () => clearInterval(t);
  }, [fetchTableSummary]);

  useEffect(() => {
    const tableIds = new Set(
      orders.flatMap((o) => (o.session.tableId != null ? [o.session.tableId] : []))
    );
    if (prevOrderTableIdsRef.current.size > 0 && tableIds.size > prevOrderTableIdsRef.current.size) {
      fetchTableSummary();
    }
    prevOrderTableIdsRef.current = tableIds;
  }, [orders, fetchTableSummary]);

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
      if (res.ok) {
        await fetchOrders();
        await fetchTableSummary();
      }
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
      await fetchTableSummary();
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
    const next = val >= 1 ? Math.max(1, Math.min(120, val)) : null;
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

  const handleToggleWaiterPopupDisabled = async () => {
    const next = !waiterPopupDisabled;
    setWaiterPopupDisabled(next);
    try {
      await fetch(`/api/admin/restaurants/${restaurantId}/reception/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receptionWaiterPopupDisabled: next }),
        credentials: "include",
      });
    } catch {
      setWaiterPopupDisabled(!next);
    }
  };

  const handleClearCallingWaiter = useCallback(
    async (tableId: number) => {
      try {
        const res = await fetch(
          `/api/admin/restaurants/${restaurantId}/reception/calling-waiter`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tableId }),
            credentials: "include",
          }
        );
        if (res.ok) {
          setCallingWaiterTables((prev) => prev.filter((t) => t.tableId !== tableId));
          await fetchCallingWaiter();
        }
      } catch {
        // ignore
      }
    },
    [restaurantId, fetchCallingWaiter]
  );

  const handleCancelItem = useCallback(
    async (itemId: number) => {
      try {
        const res = await fetch(
          `/api/admin/restaurants/${restaurantId}/reception/items/${itemId}/cancel`,
          { method: "PATCH", credentials: "include" }
        );
        if (res.ok) {
          await fetchTableSummary();
          await fetchOrders();
        }
      } catch {
        // ignore
      }
    },
    [restaurantId, fetchTableSummary, fetchOrders]
  );

  const handleMarkItemReady = useCallback(
    async (itemId: number) => {
      try {
        const res = await fetch(
          `/api/admin/restaurants/${restaurantId}/reception/items/${itemId}/ready`,
          { method: "PATCH", credentials: "include" }
        );
        if (res.ok) {
          await fetchTableSummary();
          await fetchOrders();
        }
      } catch {
        // ignore
      }
    },
    [restaurantId, fetchTableSummary, fetchOrders]
  );

  const handleCloseTableClick = useCallback((tableId: number) => {
    setCloseTableConfirmTableId(tableId);
  }, []);

  const handleConfirmCloseTable = useCallback(
    async () => {
      const tableId = closeTableConfirmTableId;
      if (tableId == null) return;
      setCloseTableConfirmTableId(null);
      try {
        const res = await fetch(
          `/api/admin/restaurants/${restaurantId}/reception/close-table`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tableId }),
            credentials: "include",
          }
        );
        if (res.ok) {
          setTableSummary((prev) => prev.filter((r) => r.tableId !== tableId));
          setSelectedTableId((id) => (id === tableId ? null : id));
          await fetchTableSummary();
          await fetchOrders();
        }
      } catch {
        // ignore
      }
    },
    [restaurantId, closeTableConfirmTableId, fetchTableSummary, fetchOrders]
  );

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

  const isOrderAlert = (sub: SubmissionDto) => {
    if (alertThresholdSec == null) return false;
    const elapsed = Math.floor((Date.now() - new Date(sub.submittedAt).getTime()) / 1000);
    return elapsed > alertThresholdSec;
  };

  return (
    <div className="flex flex-col min-h-screen min-h-0 relative gap-2 overflow-y-auto overflow-x-hidden scrollbar-dark">
      <div
        className="flex flex-col gap-2 flex-1 min-h-0"
        style={{
          width: `${100 / textScale}%`,
          minHeight: `${100 / textScale}%`,
          transform: `scale(${textScale})`,
          transformOrigin: "top right",
        }}
      >
      {/* עליון: הגדרות ימין, כל ההזמנות */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <div className="relative order-1">
          <button
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
                  className="fixed left-1/2 top-1/2 z-[101] min-w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-[#0e1118] shadow-2xl p-4"
                  role="dialog"
                  aria-label="הגדרות קבלה"
                >
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                    <span className="text-white font-medium">הגדרות</span>
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(false)}
                      className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                      aria-label="סגור"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <label className="flex flex-wrap items-center gap-2 cursor-pointer text-white/90 text-sm">
                      <input
                        type="checkbox"
                        checked={dontNotify}
                        onChange={handleToggleDontNotify}
                        className="w-4 h-4 rounded border-white/30 accent-emerald-500"
                      />
                      <span>הודעה מוכן אוטומטית אחרי</span>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={autoDeleteMinutes}
                        onChange={(e) => handleAutoDeleteChange(parseInt(e.target.value, 10) || 30)}
                        disabled={!dontNotify}
                        className="w-12 px-2 py-1 rounded-md bg-white/10 text-white text-center border border-white/10 text-sm disabled:opacity-50"
                      />
                      <span className="text-white/70">דקות.</span>
                    </label>
                    <label className="flex flex-wrap items-center gap-2 text-white/90 text-sm">
                      <input
                        type="checkbox"
                        checked={alertAfterMinutes != null && alertAfterMinutes > 0}
                        onChange={(e) => {
                          if (e.target.checked) handleAlertAfterChange(alertAfterMinutes || 10);
                          else handleAlertAfterChange(0);
                        }}
                        className="w-4 h-4 rounded border-white/30 accent-amber-500"
                      />
                      <span>התראת אזהרה אחרי</span>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={alertAfterMinutes ?? 10}
                        onChange={(e) => handleAlertAfterChange(parseInt(e.target.value, 10) || 10)}
                        disabled={alertAfterMinutes == null || alertAfterMinutes === 0}
                        className="w-12 px-2 py-1 rounded-md bg-white/10 text-white text-center border border-white/10 text-sm disabled:opacity-50"
                      />
                      <span className="text-white/70">דקות.</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-white/90 text-sm">
                      <input
                        type="checkbox"
                        checked={waiterPopupDisabled}
                        onChange={handleToggleWaiterPopupDisabled}
                        className="w-4 h-4 rounded border-white/30 accent-emerald-500"
                      />
                      <span>הסתרת הודעת &quot;קרא למלצר&quot;</span>
                    </label>
                    <div className="pt-3 border-t border-white/10">
                      <p className="text-white/80 text-sm mb-2">גודל טקסט בעמוד</p>
                      <div className="flex items-center gap-3">
                        <span className="text-white/60 text-xs tabular-nums w-8">80%</span>
                        <input
                          type="range"
                          min={0.8}
                          max={1.4}
                          step={0.05}
                          value={textScale}
                          onChange={(e) => handleTextScaleChange(parseFloat(e.target.value))}
                          className="flex-1 h-2 rounded-full bg-white/20 appearance-none accent-emerald-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow"
                        />
                        <span className="text-white/60 text-xs tabular-nums w-10">{Math.round(textScale * 100)}%</span>
                      </div>
                    </div>
                  </div>
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

      {/* הזמנות + מפה צמודים – בלי רווח ביניהם */}
      <div className="flex flex-col gap-0 shrink-0">
      {/* בונים – הזמנות פעילות בקנה 115% */}
      <div className="min-w-0 flex flex-col">
        {loading ? (
          <p className="text-white/50 text-xs">טוען...</p>
        ) : bonGroupsLeftToRight.length === 0 ? (
          <p className="text-white/50 text-xs">אין הזמנות ממתינות</p>
        ) : (
          <div className="flex flex-row flex-wrap gap-2 pb-1 min-w-0 content-start">
            <div
              className="flex flex-row flex-wrap gap-2 content-start"
              style={{
                width: `${100 / 1.15}%`,
                minHeight: `${100 / 1.15}%`,
                transform: "scale(1.15)",
                transformOrigin: "top right",
              }}
            >
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
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    {group.submissions.map((sub) => {
                      const subAlert = isOrderAlert(sub);
                      return (
                        <div key={sub.id} className="flex flex-col gap-0.5">
                          <ul className="text-white/90 text-xs break-words divide-y divide-white/[0.08]">
                            {sub.items
                              .filter((i) => i.status === "pending")
                              .flatMap((i) =>
                                Array.from({ length: i.quantity }, (_, idx) => (
                                  <li key={`${i.id}-${idx}`} className="py-1.5 first:pt-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span>{i.dishTitle}</span>
                                      <span
                                        className={`text-[10px] tabular-nums shrink-0 ${
                                          subAlert ? "text-red-400" : "text-white/50"
                                        }`}
                                      >
                                        <BonTimer submittedAt={sub.submittedAt} alertAfterMinutes={alertAfterMinutes} />
                                      </span>
                                      <div className="ms-auto flex items-center gap-0.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleMarkItemReady(i.id);
                                          }}
                                          className="p-0.5 rounded text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 shrink-0"
                                          aria-label="מוכן"
                                          title="מוכן"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCancelItem(i.id);
                                          }}
                                          className="p-0.5 rounded text-red-400 hover:text-red-300 hover:bg-red-500/20 shrink-0"
                                          aria-label="בוטל"
                                          title="בוטל"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                    {formatSelections(i.selections) && (
                                      <p className="text-white/60 text-xs mt-0.5 pr-1">{formatSelections(i.selections)}</p>
                                    )}
                                  </li>
                                ))
                              )}
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
          </div>
        )}
      </div>

      {/* מפת שולחנות – צמודה מתחת להזמנות; הרווח מתחתיה מצומצם */}
      <div className="shrink-0 w-full max-w-2xl self-center pt-1" style={{ transform: "scale(0.48)", transformOrigin: "top center", marginBottom: "calc(-1 * min(42vh, 340px))" }}>
          <ReceptionMapView
            tables={tables}
            primaryColor={primaryColor}
            selectedTableId={selectedTableId}
            onSelectTable={setSelectedTableId}
            ordersCountByTableId={ordersCountByTableId}
            activeTableIds={new Set(tableSummary.map((r) => r.tableId))}
            ordersAlertTableIds={ordersAlertTableIds}
            ordersCallingWaiterTableIds={new Set(callingWaiterTables.map((t) => t.tableId))}
          />
      </div>
      </div>

      {/* הזמנה ספציפית – רווח נמוך מתחת למפה */}
      {selectedTableId != null && (
        <div className="shrink-0 self-center mt-0.5" style={{ transform: "scale(1.316)", transformOrigin: "top center" }}>
        <div className="rounded-lg border border-white/10 bg-[#1a1d24] px-2.5 py-2 w-fit max-w-full">
          <div className="flex items-center gap-2 mb-1.5">
            <h2 className="text-lg font-semibold text-white">שולחן {selectedTableLabel}</h2>
            <button
              type="button"
              onClick={() => setSelectedTableId(null)}
              className="text-xs text-white/50 hover:text-white shrink-0"
            >
              סגור
            </button>
          </div>
          {callingWaiterTables.some((ct) => ct.tableId === selectedTableId) && (
            <div className="flex justify-end mb-2" dir="rtl">
              <div className="rounded-lg border border-amber-400 bg-amber-500 shadow shadow-amber-400/30 px-2 py-1.5 flex flex-col gap-1 w-max max-w-[140px]">
                <div className="flex items-center gap-1 text-[#1a1d24] font-bold text-xs">
                  <Bell className="w-3 h-3 shrink-0" strokeWidth={2.5} />
                  <span>קרא למלצר</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleClearCallingWaiter(selectedTableId)}
                  className="py-1 px-2 rounded text-[11px] font-medium text-amber-900 bg-amber-200 hover:bg-amber-300 border border-amber-600/40 transition-colors w-full"
                >
                  קיבלתי
                </button>
              </div>
            </div>
          )}
          {(() => {
            const tableRow = tableSummary.find((r) => r.tableId === selectedTableId);
            if (!tableRow) {
              return <p className="text-white/50 text-xs">אין פעילות בשולחן זה</p>;
            }
            const sortedItems = [...tableRow.items].sort((a, b) => {
              const order = (s: string) => (s === "ready" ? 0 : s === "pending" ? 1 : 2);
              return order(a.status) - order(b.status);
            });
            return (
              <>
                {sortedItems.length === 0 ? (
                  <p className="text-white/50 text-xs">עדיין לא הוזמן</p>
                ) : (
                  <>
                    <ul className="space-y-1 text-[11px] text-white/90">
                      {sortedItems.flatMap((line) =>
                        Array.from({ length: line.quantity }, (_, idx) => {
                          const statusLabel = line.status === "canceled" ? "בוטל" : line.status === "ready" ? "מוכן" : "לא מוכן";
                          const isCanceled = line.status === "canceled";
                          const unitPriceCents = line.status === "canceled" ? 0 : line.priceCents;
                          return (
                            <li key={`${line.itemId}-${idx}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="whitespace-nowrap">{line.dishTitle}</span>
                              {formatSelections(line.selections) && (
                                <span className="text-white/60 text-[10px]">({formatSelections(line.selections)})</span>
                              )}
                              <span className="text-amber-200 tabular-nums whitespace-nowrap">
                                {line.status === "canceled" ? "₪0" : `₪${formatPrice(unitPriceCents)}`}
                              </span>
                              <span className="ms-auto flex items-center gap-x-1.5">
                                <ItemTimer status={line.status} submittedAt={line.submittedAt} readyAt={line.readyAt} />
                                <span className={`text-[10px] ${isCanceled ? "text-red-400" : "text-white/50"}`}>({statusLabel})</span>
                              </span>
                            </li>
                          );
                        })
                      )}
                    </ul>
                    <div className="flex items-center gap-2 text-white/95 text-xs font-semibold mt-1.5 pt-1.5 border-t border-white/10">
                      <span>סה״כ</span>
                      <span className="tabular-nums text-amber-200">₪{formatPrice(tableRow.totalCents)}</span>
                    </div>
                    <div className="flex gap-2 mt-1.5">
                      <button
                        type="button"
                        className="px-2 py-1 rounded text-[11px] bg-white/10 text-white/80 hover:bg-white/15"
                      >
                        <Printer className="w-3 h-3 inline-block ml-1" />
                        הדפס
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCloseTableClick(selectedTableId)}
                        className="px-2 py-1 rounded text-[11px] bg-red-500/30 text-white hover:bg-red-500/50"
                      >
                        סגור חשבון
                      </button>
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </div>
        </div>
      )}

      {/* מודאל אישור מחיקת חשבון */}
      {closeTableConfirmTableId != null &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[105] flex items-center justify-center p-4" role="dialog" aria-label="אישור מחיקת חשבון">
            <div
              className="absolute inset-0 bg-black/70"
              aria-hidden
              onClick={() => setCloseTableConfirmTableId(null)}
            />
            <div
              className="relative rounded-xl border border-white/10 bg-[#1a1d24] shadow-2xl p-6 flex flex-col items-center gap-5 min-w-[260px]"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-white text-center font-medium">האם למחוק את החשבון?</p>
              <div className="flex gap-3 w-full justify-center">
                <button
                  type="button"
                  onClick={handleConfirmCloseTable}
                  className="px-5 py-2 rounded-lg font-medium text-white bg-emerald-600 hover:bg-emerald-500"
                >
                  כן
                </button>
                <button
                  type="button"
                  onClick={() => setCloseTableConfirmTableId(null)}
                  className="px-5 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-500"
                >
                  לא
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* פופאפ קריאה למלצר */}
      {!waiterPopupDisabled &&
        callingWaiterTables.length > 0 &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[110] bg-black/60"
              aria-hidden
              onClick={() => handleClearCallingWaiter(callingWaiterTables[0].tableId)}
            />
            <div
              className="fixed inset-0 z-[111] flex items-center justify-center p-4"
              role="dialog"
              aria-label="קריאה למלצר"
            >
              <div
                className="rounded-xl border border-amber-500/50 bg-[#1a1d24] shadow-2xl p-6 flex flex-col items-center gap-4 min-w-[280px] max-w-[90vw]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2 text-amber-400">
                  <Bell className="w-8 h-8" />
                  <h3 className="text-lg font-bold text-white">
                    שולחן {callingWaiterTables[0].label} קורא למלצר
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleClearCallingWaiter(callingWaiterTables[0].tableId)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-colors"
                  style={{ backgroundColor: "#2F7C73" }}
                >
                  <Check className="w-4 h-4" />
                  קיבלתי
                </button>
              </div>
            </div>
          </>,
          document.body
        )}

      </div>
    </div>
  );
}
