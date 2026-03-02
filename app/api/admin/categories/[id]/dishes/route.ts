import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dishSchema } from "@/lib/validation/menu";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const categoryId = parseInt(id, 10);
  if (isNaN(categoryId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await request.json();
  const parsed = dishSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const maxOrder = await prisma.dish.aggregate({
    where: { categoryId },
    _max: { sortOrder: true },
  });
  const dish = await prisma.dish.create({
    data: {
      categoryId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      allergens: parsed.data.allergens ?? null,
      priceCents: parsed.data.priceCents,
      imageUrl: parsed.data.imageUrl ?? null,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });
  return NextResponse.json(dish);
}

