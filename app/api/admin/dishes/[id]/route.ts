import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dishSchema } from "@/lib/validation/menu";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dishId = parseInt(params.id);
  if (isNaN(dishId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await request.json();
  const parsed = dishSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const dish = await prisma.dish.update({
    where: { id: dishId },
    data: {
      ...(parsed.data.title != null && { title: parsed.data.title }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(parsed.data.allergens !== undefined && { allergens: parsed.data.allergens }),
      ...(parsed.data.priceCents != null && { priceCents: parsed.data.priceCents }),
      ...(parsed.data.imageUrl !== undefined && { imageUrl: parsed.data.imageUrl }),
      ...(parsed.data.sortOrder != null && { sortOrder: parsed.data.sortOrder }),
    },
  });
  return NextResponse.json(dish);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dishId = parseInt(params.id);
  if (isNaN(dishId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  await prisma.dish.delete({ where: { id: dishId } });
  return NextResponse.json({ ok: true });
}
