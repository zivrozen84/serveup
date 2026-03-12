import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET – סיכום שולחנות פעילים: לכל שולחן עם סשן פעיל – רשימת פריטים שהוזמנו (מכל ההזמנות, pending + ready) ומחיר סה"כ.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt((await params).id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const now = new Date();

  const sessions = await prisma.orderSession.findMany({
    where: {
      restaurantId: id,
      status: "active",
      expiresAt: { gt: now },
      tableId: { not: null },
    },
    select: {
      id: true,
      tableId: true,
      table: { select: { id: true, tableNumber: true, label: true } },
    },
  });

  const tableIds = [...new Set(sessions.map((s) => s.tableId).filter(Boolean) as number[])];
  if (tableIds.length === 0) {
    return NextResponse.json({ tables: [] });
  }

  const sessionIds = sessions.map((s) => s.id);
  const submissions = await prisma.orderSubmission.findMany({
    where: { orderSessionId: { in: sessionIds } },
    select: { id: true, orderSessionId: true, submittedAt: true, readyAt: true },
  });
  const submissionIds = submissions.map((s) => s.id);

  const items = await prisma.orderSubmissionItem.findMany({
    where: { orderSubmissionId: { in: submissionIds } },
    include: {
      dish: { select: { id: true, title: true } },
    },
  });

  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const submissionById = new Map(submissions.map((s) => [s.id, s]));

  type Line = { itemId: number; dishTitle: string; quantity: number; priceCents: number; lineTotalCents: number; status: string; selections: unknown; submittedAt: string; readyAt: string | null };
  const byTable = new Map<number, { tableLabel: string; lines: Line[]; totalCents: number }>();

  for (const tId of tableIds) {
    const tbl = sessions.find((s) => s.tableId === tId)?.table;
    const trimmed = tbl?.label?.trim();
    const label = (trimmed && trimmed !== "שולחן" ? trimmed : (tbl?.tableNumber != null ? String(tbl.tableNumber) : null)) ?? String(tId);
    byTable.set(tId, { tableLabel: label, lines: [], totalCents: 0 });
  }

  for (const item of items) {
    const sub = submissionById.get(item.orderSubmissionId);
    if (!sub) continue;
    const sess = sessionById.get(sub.orderSessionId);
    if (!sess?.tableId) continue;
    const row = byTable.get(sess.tableId);
    if (!row) continue;

    const status = (item as { status?: string }).status ?? "pending";
    const lineTotalCents = status === "canceled" ? 0 : item.quantity * item.priceCents;
    const subAny = sub as { submittedAt: Date; readyAt: Date | null };
    const submittedAt = subAny.submittedAt;
    const readyAt = subAny.readyAt;
    row.lines.push({
      itemId: item.id,
      dishTitle: item.dish.title,
      quantity: item.quantity,
      priceCents: item.priceCents,
      lineTotalCents,
      status,
      selections: item.selections ?? null,
      submittedAt: submittedAt instanceof Date ? submittedAt.toISOString() : String(submittedAt),
      readyAt: readyAt instanceof Date ? readyAt.toISOString() : (readyAt ?? null),
    });
    row.totalCents += lineTotalCents;
  }

  const tables = tableIds.map((tableId) => {
    const row = byTable.get(tableId)!;
    return {
      tableId,
      tableLabel: row.tableLabel,
      items: row.lines,
      totalCents: row.totalCents,
    };
  });

  return NextResponse.json({ tables });
}
