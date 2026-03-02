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

  const { id } = await params;
  const dishId = parseInt(id);
  if (isNaN(dishId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה", message: "בקשה לא תקינה" }, { status: 400 });
  }
  const parsed = dishSchema.partial().safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstMsg = flat.formErrors?.[0] ?? Object.values(flat.fieldErrors ?? {}).flat().find(Boolean);
    return NextResponse.json({
      error: firstMsg || "נתונים לא תקינים",
      message: firstMsg || "נתונים לא תקינים",
      fieldErrors: flat.fieldErrors,
      formErrors: flat.formErrors,
    }, { status: 400 });
  }

  const data = parsed.data;
  const priceCents = data.priceCents != null ? Math.round(Number(data.priceCents)) : undefined;
  if (priceCents != null && (priceCents < 0 || !Number.isFinite(priceCents))) {
    return NextResponse.json({ error: "מחיר לא תקין", message: "מחיר לא תקין" }, { status: 400 });
  }

  try {
    const dish = await prisma.dish.update({
      where: { id: dishId },
      data: {
        ...(data.title != null && { title: String(data.title).trim() }),
        ...(data.description !== undefined && { description: data.description || null }),
        ...(data.allergens !== undefined && { allergens: data.allergens || null }),
        ...(priceCents != null && { priceCents }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
        ...(data.sortOrder != null && { sortOrder: data.sortOrder }),
      },
    });
    return NextResponse.json(dish);
  } catch (e) {
    console.error("Dish update error:", e);
    return NextResponse.json({ error: "שגיאה בשמירה", message: "שגיאה בשמירה" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const dishId = parseInt(id);
  if (isNaN(dishId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  await prisma.dish.delete({ where: { id: dishId } });
  return NextResponse.json({ ok: true });
}
