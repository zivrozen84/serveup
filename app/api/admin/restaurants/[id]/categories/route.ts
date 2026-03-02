import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/validation/menu";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const restaurantId = parseInt(params.id);
  if (isNaN(restaurantId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const categories = await prisma.category.findMany({
    where: { restaurantId },
    include: { dishes: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(categories);
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
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const maxOrder = await prisma.category.aggregate({
    where: { restaurantId },
    _max: { sortOrder: true },
  });
  const category = await prisma.category.create({
    data: {
      restaurantId,
      name: parsed.data.name,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
  return NextResponse.json(category);
}
