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

  try {
    const dish = await prisma.dish.update({
      where: { id: dishId },
      data: {
        ...(parsed.data.title != null && { title: parsed.data.title }),
        ...(parsed.data.description !== undefined && { description: parsed.data.description }),
        ...(parsed.data.allergens !== undefined && { allergens: parsed.data.allergens }),
        ...(parsed.data.priceCents != null && { priceCents: parsed.data.priceCents }),
        ...(parsed.data.imageUrl !== undefined && { imageUrl: parsed.data.imageUrl ?? null }),
        ...(parsed.data.sortOrder != null && { sortOrder: parsed.data.sortOrder }),
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
