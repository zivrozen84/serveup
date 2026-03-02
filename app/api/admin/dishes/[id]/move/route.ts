import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const dishId = parseInt(id);
  if (isNaN(dishId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await req.json();
  const { targetCategoryId, targetIndex } = body as { targetCategoryId: number; targetIndex: number };
  if (typeof targetCategoryId !== "number" || typeof targetIndex !== "number" || targetIndex < 0) {
    return NextResponse.json({ error: "Invalid targetCategoryId or targetIndex" }, { status: 400 });
  }

  const dish = await prisma.dish.findUnique({ where: { id: dishId } });
  if (!dish) return NextResponse.json({ error: "Dish not found" }, { status: 404 });

  const oldCategoryId = dish.categoryId;
  const isSameCategory = oldCategoryId === targetCategoryId;

  if (isSameCategory) {
    const dishes = await prisma.dish.findMany({
      where: { categoryId: oldCategoryId },
      orderBy: { sortOrder: "asc" },
    });
    const oldIndex = dishes.findIndex((d) => d.id === dishId);
    if (oldIndex === -1) return NextResponse.json({ error: "Dish not in category" }, { status: 400 });

    const newOrder = [...dishes];
    const [removed] = newOrder.splice(oldIndex, 1);
    newOrder.splice(targetIndex, 0, removed);

    await prisma.$transaction(
      newOrder.map((d, i) =>
        prisma.dish.update({ where: { id: d.id }, data: { sortOrder: i } })
      )
    );
  } else {
    await prisma.$transaction(async (tx) => {
      const oldDishes = await tx.dish.findMany({
        where: { categoryId: oldCategoryId },
        orderBy: { sortOrder: "asc" },
      });
      const oldIndex = oldDishes.findIndex((d) => d.id === dishId);
      for (let i = oldIndex + 1; i < oldDishes.length; i++) {
        await tx.dish.update({
          where: { id: oldDishes[i].id },
          data: { sortOrder: i - 1 },
        });
      }

      const newDishes = await tx.dish.findMany({
        where: { categoryId: targetCategoryId },
        orderBy: { sortOrder: "asc" },
      });
      for (let i = targetIndex; i < newDishes.length; i++) {
        await tx.dish.update({
          where: { id: newDishes[i].id },
          data: { sortOrder: i + 1 },
        });
      }

      await tx.dish.update({
        where: { id: dishId },
        data: { categoryId: targetCategoryId, sortOrder: targetIndex },
      });
    });
  }

  return NextResponse.json({ ok: true });
}
