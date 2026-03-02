import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { tableSchema } from "@/lib/validation/menu";
import { randomBytes } from "crypto";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const restaurantId = parseInt(params.id);
  if (isNaN(restaurantId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const tables = await prisma.table.findMany({
    where: { restaurantId },
    orderBy: { tableNumber: "asc" },
  });
  return NextResponse.json(tables);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const restaurantId = parseInt(params.id);
  if (isNaN(restaurantId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await request.json();
  const parsed = tableSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const token = randomBytes(16).toString("hex");
  const table = await prisma.table.create({
    data: {
      restaurantId,
      tableNumber: parsed.data.tableNumber,
      description: parsed.data.description ?? null,
      token,
    },
  });
  return NextResponse.json(table);
}
