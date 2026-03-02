import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
