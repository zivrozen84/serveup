import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tableUpdateSchema } from "@/lib/validation/menu";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; tableId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: restaurantIdStr, tableId: tableIdStr } = await params;
  const restaurantId = parseInt(restaurantIdStr);
  const tableId = parseInt(tableIdStr);
  if (isNaN(restaurantId) || isNaN(tableId))
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const table = await prisma.table.findFirst({
    where: { id: tableId, restaurantId },
  });
  if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

  const body = await request.json();
  const parsed = tableUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data as Record<string, unknown>;
  const updateData: Record<string, unknown> = {};
  if (data.label !== undefined) updateData.label = data.label;
  if (data.capacity !== undefined) updateData.capacity = data.capacity;
  if (data.positionX !== undefined) updateData.positionX = data.positionX;
  if (data.positionY !== undefined) updateData.positionY = data.positionY;
  if (data.shape !== undefined) updateData.shape = data.shape;

  const updated = await prisma.table.update({
    where: { id: tableId },
    data: updateData,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; tableId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: restaurantIdStr, tableId: tableIdStr } = await params;
  const restaurantId = parseInt(restaurantIdStr);
  const tableId = parseInt(tableIdStr);
  if (isNaN(restaurantId) || isNaN(tableId))
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const table = await prisma.table.findFirst({
    where: { id: tableId, restaurantId },
  });
  if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

  await prisma.table.delete({ where: { id: tableId } });
  return NextResponse.json({ ok: true });
}
