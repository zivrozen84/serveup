import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID, randomBytes } from "crypto";

const SESSION_DURATION_MINUTES = 90;
const ISRAEL_TZ = "Asia/Jerusalem";

function parseHhMm(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function isWithinOpeningHours(openTime: string | null, closeTime: string | null): boolean {
  if (!openTime || !closeTime) return true;
  const now = new Date();
  const local = new Date(now.toLocaleString("en-CA", { timeZone: ISRAEL_TZ }));
  const current = local.getHours() * 60 + local.getMinutes();
  const open = parseHhMm(openTime);
  const close = parseHhMm(closeTime);
  if (open <= close) return current >= open && current <= close;
  return current >= open || current <= close;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, isActive: true },
    select: { id: true, openTime: true, closeTime: true },
  });
  if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const r = restaurant as { openTime?: string | null; closeTime?: string | null };
  if (!isWithinOpeningHours(r.openTime ?? null, r.closeTime ?? null)) {
    return NextResponse.json(
      { error: "closed", message: "המסעדה סגורה עכשיו" },
      { status: 403 }
    );
  }

  let body: { tableToken?: string; tableId?: number; label?: string } = {};
  try {
    body = await req.json();
  } catch {
    // no body ok
  }

  let tableId: number | null = null;
  let label: string | null = null;

  const specificTableRequested = !!(body.tableToken ?? (body.tableId != null));

  if (body.tableToken) {
    const table = await prisma.table.findFirst({
      where: { restaurantId: restaurant.id, token: body.tableToken },
      select: { id: true, label: true, tableNumber: true, isOffline: true },
    });
    if (table && !table.isOffline) {
      tableId = table.id;
      label = table.label || `שולחן ${table.tableNumber}`;
    }
  } else if (body.tableId != null) {
    const table = await prisma.table.findFirst({
      where: { restaurantId: restaurant.id, id: body.tableId },
      select: { id: true, label: true, tableNumber: true, isOffline: true },
    });
    if (table && !table.isOffline) {
      tableId = table.id;
      label = table.label || `שולחן ${table.tableNumber}`;
    }
  } else {
    // שיוך אקראי לשולחן פנוי (רק שולחנות לא OFFLINE); אם אין שולחנות – יוצרים שולחן חדש במפה
    const now = new Date();
    let tables = await prisma.table.findMany({
      where: { restaurantId: restaurant.id, isOffline: false },
      select: { id: true, label: true, tableNumber: true },
    });

    if (tables.length === 0) {
      const maxNum = await prisma.table.aggregate({
        where: { restaurantId: restaurant.id },
        _max: { tableNumber: true },
      });
      const tableNumber = (maxNum._max.tableNumber ?? 0) + 1;
      const newTable = await prisma.table.create({
        data: {
          restaurantId: restaurant.id,
          tableNumber,
          token: randomBytes(16).toString("hex"),
          label: String(tableNumber),
          capacity: 2,
          positionX: 50,
          positionY: 50,
          shape: "rectangle",
        },
      });
      tableId = newTable.id;
      label = newTable.label || `שולחן ${newTable.tableNumber}`;
    } else {
      const activeByTable = await prisma.orderSession.groupBy({
        by: ["tableId"],
        where: {
          restaurantId: restaurant.id,
          status: "active",
          expiresAt: { gt: now },
          tableId: { not: null },
        },
        _count: { id: true },
      });
      const busyTableIds = new Set(activeByTable.map((g) => g.tableId).filter((id): id is number => id != null));
      const freeTables = tables.filter((t) => !busyTableIds.has(t.id));

      if (freeTables.length > 0) {
        const chosen = freeTables[Math.floor(Math.random() * freeTables.length)];
        tableId = chosen.id;
        label = chosen.label || `שולחן ${chosen.tableNumber}`;
      } else {
        // כל השולחנות תפוסים – יוצרים שולחן חדש (4 מקומות), ממוקם על המפה
        const maxNum = await prisma.table.aggregate({
          where: { restaurantId: restaurant.id },
          _max: { tableNumber: true },
        });
        const tableNumber = (maxNum._max.tableNumber ?? 0) + 1;
        const offset = tables.length * 8;
        const positionX = Math.min(90, 30 + (offset % 60));
        const positionY = Math.min(90, 30 + Math.floor(offset / 60) * 25);
        const newTable = await prisma.table.create({
          data: {
            restaurantId: restaurant.id,
            tableNumber,
            token: randomBytes(16).toString("hex"),
            label: String(tableNumber),
            capacity: 4,
            positionX,
            positionY,
            shape: "rectangle",
          },
        });
        tableId = newTable.id;
        label = newTable.label || `שולחן ${newTable.tableNumber}`;
      }
    }
  }
  if (body.label) label = body.label;

  if (specificTableRequested && tableId == null) {
    return NextResponse.json(
      { error: "table_unavailable", message: "השולחן לא פעיל כרגע" },
      { status: 403 }
    );
  }

  // לינק לשולחן ספציפי: אם כבר יש סשן פעיל לשולחן – מצטרפים לאותו סשן (עגלה משותפת)
  if (specificTableRequested && tableId != null) {
    const now = new Date();
    const existing = await prisma.orderSession.findFirst({
      where: {
        restaurantId: restaurant.id,
        tableId,
        status: "active",
        expiresAt: { gt: now },
      },
      select: { id: true, token: true, expiresAt: true, label: true },
    });
    if (existing) {
      return NextResponse.json({
        token: existing.token,
        expiresAt: existing.expiresAt.toISOString(),
        sessionId: existing.id,
        label: existing.label,
      });
    }
  }

  const expiresAt = new Date(Date.now() + SESSION_DURATION_MINUTES * 60 * 1000);
  const token = randomUUID();

  const session = await prisma.orderSession.create({
    data: {
      restaurantId: restaurant.id,
      tableId,
      token,
      label,
      status: "active",
      expiresAt,
    },
  });

  return NextResponse.json({
    token: session.token,
    expiresAt: session.expiresAt.toISOString(),
    sessionId: session.id,
    label: session.label,
  });
}
