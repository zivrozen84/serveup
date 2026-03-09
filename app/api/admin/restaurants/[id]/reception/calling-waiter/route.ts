import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** GET – רשימת שולחנות שקוראים למלצר */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt((await params).id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const sessions = await prisma.orderSession.findMany({
    where: {
      restaurantId: id,
      status: "active",
      callingWaiterAt: { not: null },
      tableId: { not: null },
    },
    select: {
      tableId: true,
      table: { select: { id: true, tableNumber: true, label: true } },
    },
  });

  const byTableId = new Map<
    number,
    { tableId: number; label: string; tableNumber: number }
  >();
  sessions.forEach((s) => {
    if (s.tableId == null || !s.table) return;
    const label = s.table.label ?? String(s.table.tableNumber);
    if (!byTableId.has(s.tableId)) {
      byTableId.set(s.tableId, {
        tableId: s.tableId,
        label,
        tableNumber: s.table.tableNumber,
      });
    }
  });

  return NextResponse.json({
    tableIds: Array.from(byTableId.keys()),
    tables: Array.from(byTableId.values()),
  });
}

/** PATCH – איפוס קריאה למלצר לשולחן (קיבלתי / לחיצה כפולה) */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt((await params).id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  let body: { tableId?: number } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const tableId = typeof body.tableId === "number" ? body.tableId : null;
  if (tableId == null) return NextResponse.json({ error: "tableId required" }, { status: 400 });

  await prisma.orderSession.updateMany({
    where: {
      restaurantId: id,
      tableId,
      callingWaiterAt: { not: null },
    },
    data: { callingWaiterAt: null },
  });

  return NextResponse.json({ ok: true });
}
