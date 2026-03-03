import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST – העתקת קטגוריות פרמטרים ופרמטרים ממנה אחרת.
 * רק הפרמטרים מועתקים; כותרת, תיאור ומחיר המנה לא משתנים.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const targetDishId = parseInt((await params).id);
  if (isNaN(targetDishId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  let body: { sourceDishId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }
  const sourceDishId = typeof body?.sourceDishId === "number" ? body.sourceDishId : undefined;
  if (sourceDishId == null || sourceDishId === targetDishId) {
    return NextResponse.json({ error: "נא לבחור מנת מקור שונה" }, { status: 400 });
  }

  const [targetDish, sourceDish] = await Promise.all([
    prisma.dish.findUnique({
      where: { id: targetDishId },
      include: { category: { select: { restaurantId: true } } },
    }),
    prisma.dish.findUnique({
      where: { id: sourceDishId },
      include: {
        category: { select: { restaurantId: true } },
        paramCategories: { include: { parameters: { orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } },
      },
    }),
  ]);

  if (!targetDish || !sourceDish) {
    return NextResponse.json({ error: "מנה לא נמצאה" }, { status: 404 });
  }
  if (targetDish.category.restaurantId !== sourceDish.category.restaurantId) {
    return NextResponse.json({ error: "ניתן להעתיק פרמטרים רק ממנה באותה מסעדה" }, { status: 400 });
  }

  // מחיקת קטגוריות ופרמטרים קיימים של המנה היעד (אופציונלי – או למזג; כרגע מחליף)
  await prisma.dishParameter.deleteMany({
    where: { category: { dishId: targetDishId } },
  });
  await prisma.dishParameterCategory.deleteMany({
    where: { dishId: targetDishId },
  });

  // העתקה: יצירת קטגוריות ופרמטרים חדשים
  const newCatIds = new Map<number, number>();
  for (const cat of sourceDish.paramCategories) {
    const created = await prisma.dishParameterCategory.create({
      data: {
        dishId: targetDishId,
        name: cat.name,
        sortOrder: cat.sortOrder,
        minSelections: cat.minSelections,
        maxSelections: cat.maxSelections,
      },
    });
    newCatIds.set(cat.id, created.id);
  }
  for (const cat of sourceDish.paramCategories) {
    const newCatId = newCatIds.get(cat.id);
    if (newCatId == null) continue;
    for (const param of cat.parameters) {
      await prisma.dishParameter.create({
        data: {
          categoryId: newCatId,
          name: param.name,
          sortOrder: param.sortOrder,
          priceCents: param.priceCents,
        },
      });
    }
  }

  const updated = await prisma.dish.findUnique({
    where: { id: targetDishId },
    include: {
      paramCategories: {
        include: { parameters: { orderBy: { sortOrder: "asc" } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  return NextResponse.json(updated);
}
