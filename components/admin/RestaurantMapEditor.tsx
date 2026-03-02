"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Circle, Square, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Table {
  id: number;
  tableNumber: number;
  label: string | null;
  capacity: number;
  positionX: number | null;
  positionY: number | null;
  shape: string | null;
  token: string;
}

interface RestaurantMapEditorProps {
  restaurantId: number;
  restaurantName: string;
  primaryColor: string;
}

const CANVAS_W = 800;
const CANVAS_H = 500;

function toPercent(val: number) {
  return Math.max(0, Math.min(100, val));
}

function isDoor(table: Table) {
  return (table.label === "דלת" && (table.capacity ?? 0) === 0) || table.shape === "door";
}

export function RestaurantMapEditor({
  restaurantId,
  restaurantName,
  primaryColor,
}: RestaurantMapEditorProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCapacity, setEditCapacity] = useState(2);
  const [saveLoading, setSaveLoading] = useState(false);
  const [dragTable, setDragTable] = useState<{ table: Table; startX: number; startY: number; startPX: number; startPY: number } | null>(null);
  const dragPosRef = useRef<{ x: number; y: number }>({ x: 50, y: 50 });
  const dragMovedRef = useRef(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const fetchTables = useCallback(async () => {
    const res = await fetch(`/api/admin/restaurants/${restaurantId}/tables`);
    if (res.ok) {
      const data = await res.json();
      setTables(data);
    }
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  async function handleAddTable(shape: "circle" | "rectangle") {
    setSaveLoading(true);
    const offset = tables.length * 8;
    const px = Math.min(90, 30 + (offset % 60));
    const py = Math.min(90, 30 + Math.floor(offset / 60) * 25);
    try {
      const res = await fetch(`/api/admin/restaurants/${restaurantId}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shape,
          capacity: 2,
          label: "",
          positionX: px,
          positionY: py,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTables((p) => [...p, data]);
        setEditingTable(data);
        setEditLabel(data.label || String(data.tableNumber));
        setEditCapacity(data.capacity);
      }
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleAddDoor() {
    setSaveLoading(true);
    const offset = tables.length * 8;
    const px = Math.min(90, 30 + (offset % 60));
    const py = Math.min(90, 30 + Math.floor(offset / 60) * 25);
    try {
      const res = await fetch(`/api/admin/restaurants/${restaurantId}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shape: "door",
          capacity: 0,
          label: "דלת",
          positionX: px,
          positionY: py,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTables((p) => [...p, data]);
      }
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleUpdateTable(tableId: number, updates: Partial<Table>) {
    const res = await fetch(`/api/admin/restaurants/${restaurantId}/tables/${tableId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = await res.json();
      setTables((p) => p.map((t) => (t.id === tableId ? data : t)));
    }
  }

  async function handleDeleteTable(tableId: number) {
    if (!confirm("למחוק שולחן?")) return;
    const res = await fetch(`/api/admin/restaurants/${restaurantId}/tables/${tableId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setTables((p) => p.filter((t) => t.id !== tableId));
      setEditingTable(null);
    }
  }

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, table: Table) => {
      e.stopPropagation();
      // אם זו לחיצה כפולה – לא מתחילים גרירה (רק עריכה)
      if (e.detail > 1) return;
      if (editingTable?.id === table.id) return;
      const px = table.positionX ?? 50;
      const py = table.positionY ?? 50;
      dragMovedRef.current = false;
      setDragTable({ table, startX: e.clientX, startY: e.clientY, startPX: px, startPY: py });
    },
    [editingTable]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragTable || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const dx = ((e.clientX - dragTable.startX) / rect.width) * 100;
      const dy = ((e.clientY - dragTable.startY) / rect.height) * 100;
      // אם כמעט לא זזנו – לא מעדכנים (כדי שקליק בלבד לא יזיז שולחן)
      const threshold = 0.5; // אחוזים (בערך כמה פיקסלים)
      if (!dragMovedRef.current && Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
        return;
      }
      dragMovedRef.current = true;
      const nx = toPercent(dragTable.startPX + dx);
      const ny = toPercent(dragTable.startPY + dy);
      dragPosRef.current = { x: nx, y: ny };
      setTables((p) =>
        p.map((t) =>
          t.id === dragTable.table.id ? { ...t, positionX: nx, positionY: ny } : t
        )
      );
    },
    [dragTable]
  );

  const handleMouseUp = useCallback(() => {
    if (!dragTable) return;
    // אם לא הייתה תזוזה משמעותית – לא שומרים מיקום חדש (קליק בלבד)
    if (dragMovedRef.current) {
      const { x, y } = dragPosRef.current;
      handleUpdateTable(dragTable.table.id, { positionX: x, positionY: y });
    }
    setDragTable(null);
    dragMovedRef.current = false;
  }, [dragTable]);

  useEffect(() => {
    if (dragTable) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragTable, handleMouseMove, handleMouseUp]);

  const totalCapacity = tables.reduce((s, t) => (isDoor(t) ? s : s + (t.capacity || 0)), 0);

  function moveTableInList(index: number, dir: "up" | "down") {
    setTables((prev) => {
      const next = [...prev];
      const newIndex = dir === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= next.length) return prev;
      const [item] = next.splice(index, 1);
      next.splice(newIndex, 0, item);
      return next;
    });
  }

  function moveTableInList(index: number, direction: "up" | "down") {
    setTables((prev) => {
      const next = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
  }

  if (loading) return <p className="text-white/70">טוען...</p>;

  return (
    <div className="flex gap-6 flex-col lg:flex-row">
      <div className="flex-1 min-h-0">
        <div
          ref={canvasRef}
          className="relative rounded-xl border border-white/10 bg-[#1a1d24] min-h-[400px]"
          style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
        >
          {tables.map((t) => {
            const px = t.positionX ?? 50;
            const py = t.positionY ?? 50;
            const circle = t.shape === "circle";
            const door = isDoor(t);
            const label = t.label || String(t.tableNumber);
            return (
              <div
                key={t.id}
                onMouseDown={(e) => handleMouseDown(e, t)}
                onClick={(e) => {
                  if (!door) return;
                  e.stopPropagation();
                  setEditingTable(t);
                  setEditLabel(label);
                  setEditCapacity(t.capacity);
                }}
                onDoubleClick={(e) => {
                  if (door) return; // עבור דלת מספיק לחיצה אחת
                  e.stopPropagation();
                  // לחיצה כפולה – פותח עריכה ומבטל כל גרירה פעילה
                  setDragTable(null);
                  setEditingTable(t);
                  setEditLabel(label);
                  setEditCapacity(t.capacity);
                }}
                className="absolute cursor-grab active:cursor-grabbing select-none flex flex-col items-center justify-center transition-shadow hover:shadow-lg"
                style={{
                  left: `${px}%`,
                  top: `${py}%`,
                  transform: "translate(-50%, -50%)",
                  width: door ? 60 : circle ? 56 : 64,
                  height: door ? 16 : circle ? 56 : 48,
                }}
              >
                <div
                  className={`w-full h-full flex flex-col items-center justify-center text-white font-bold text-sm border-2 ${
                    editingTable?.id === t.id ? "ring-2 ring-white" : ""
                  }`}
                  style={{
                    backgroundColor: door ? "#ffffff" : primaryColor,
                    borderRadius: circle ? "50%" : door ? "4px" : "8px",
                  }}
                >
                  <span>{door ? "" : label || "?"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <aside className="w-72 shrink-0 rounded-xl border border-white/5 bg-[#0e1118] p-4">
        <h3 className="font-semibold text-white mb-4">הוסף שולחן / דלת</h3>
        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => handleAddTable("rectangle")}
            disabled={saveLoading}
            className="flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
          >
            <Square className="w-8 h-8 text-white/80" />
            <span className="text-sm text-white">שולחן</span>
          </button>
          <button
            type="button"
            onClick={handleAddDoor}
            disabled={saveLoading}
            className="flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border border-white/10 hover:border-white/20 transition-colors"
          >
            <Square className="w-8 h-8 text-white/80" />
            <span className="text-sm text-white">דלת</span>
          </button>
        </div>

        <h3 className="font-semibold text-white mb-2">שולחנות ({tables.length})</h3>
        <p className="text-sm text-white/60 mb-3">סה״כ {totalCapacity} מקומות</p>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto scrollbar-hide pr-1">
          {tables.map((t, idx) => (
            <div
              key={t.id}
              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${
                editingTable?.id === t.id ? "bg-white/10" : "hover:bg-white/5"
              }`}
              onClick={() => {
                setEditingTable(t);
                setEditLabel(t.label || String(t.tableNumber));
                setEditCapacity(t.capacity);
              }}
            >
              <span className="text-white font-medium flex-1">
                {isDoor(t)
                  ? "דלת"
                  : `${t.label || t.tableNumber} - ${t.capacity || 0} מקומות`}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTable(t.id);
                }}
                className="text-red-400 hover:text-red-300 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div className="flex flex-col ml-1 text-white/40">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveTableInList(idx, "up");
                  }}
                  className="hover:text-white disabled:opacity-30"
                  disabled={idx === 0}
                  aria-label="הזז למעלה"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    moveTableInList(idx, "down");
                  }}
                  className="hover:text-white disabled:opacity-30"
                  disabled={idx === tables.length - 1}
                  aria-label="הזז למטה"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <Dialog.Root open={!!editingTable} onOpenChange={(o) => !o && setEditingTable(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm rounded-xl border border-white/5 bg-[#0e1118] p-6 z-50">
            <Dialog.Title className="text-lg font-semibold mb-4 text-white">
              עריכת שולחן
            </Dialog.Title>
            {editingTable && (
              <div className="space-y-4">
                {isDoor(editingTable) ? (
                  <p className="text-sm text-white/70">
                    זהו אובייקט דלת. לא ניתן להגדיר עליו מקומות ישיבה, רק להסיר אותו מהמפה.
                  </p>
                ) : (
                  <>
                    <div>
                      <label className="text-sm text-white/80 block mb-1">שם/מספר שולחן</label>
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        placeholder="1"
                        className="bg-[#1A1D21] border-white/10 text-white placeholder:text-white/40"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-white/80 block mb-1">כמות מקומות</label>
                      <Input
                        type="number"
                        min={1}
                        value={editCapacity}
                        onChange={(e) => setEditCapacity(parseInt(e.target.value) || 1)}
                        className="bg-[#1A1D21] border-white/10 text-white placeholder:text-white/40"
                      />
                    </div>
                  </>
                )}
                <div className="flex gap-2 pt-2">
                  {!isDoor(editingTable) && (
                    <Button
                      onClick={() => {
                        handleUpdateTable(editingTable.id, {
                          label: editLabel.trim() || null,
                          capacity: editCapacity,
                        });
                        setEditingTable(null);
                      }}
                      className="text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      שמור
                    </Button>
                  )}
                  <Dialog.Close asChild>
                    <Button
                      variant="outline"
                      className="border-red-600 bg-red-700 text-white hover:bg-red-600 hover:border-red-500"
                    >
                      ביטול
                    </Button>
                  </Dialog.Close>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-500 text-red-400 hover:bg-red-500/10"
                    onClick={() => {
                      handleDeleteTable(editingTable.id);
                    }}
                  >
                    הסר
                  </Button>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
