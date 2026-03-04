import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

const SESSION_DURATION_MINUTES = 90;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug, isActive: true },
    select: { id: true },
  });
  if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { tableToken?: string; tableId?: number; label?: string } = {};
  try {
    body = await req.json();
  } catch {
    // no body ok
  }

  let tableId: number | null = null;
  let label: string | null = null;

  if (body.tableToken) {
    const table = await prisma.table.findFirst({
      where: { restaurantId: restaurant.id, token: body.tableToken },
      select: { id: true, label: true, tableNumber: true },
    });
    if (table) {
      tableId = table.id;
      label = table.label || `שולחן ${table.tableNumber}`;
    }
  } else if (body.tableId != null) {
    const table = await prisma.table.findFirst({
      where: { restaurantId: restaurant.id, id: body.tableId },
      select: { id: true, label: true, tableNumber: true },
    });
    if (table) {
      tableId = table.id;
      label = table.label || `שולחן ${table.tableNumber}`;
    }
  }
  if (body.label) label = body.label;

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
