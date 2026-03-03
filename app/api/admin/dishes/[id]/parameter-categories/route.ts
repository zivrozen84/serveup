import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dishParameterCategorySchema } from "@/lib/validation/menu";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const dishId = parseInt(id);
  if (isNaN(dishId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const dish = await prisma.dish.findUnique({ where: { id: dishId } });
  if (!dish) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }
  const parsed = dishParameterCategorySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors?.name?.[0] ?? "נתונים לא תקינים";
    return NextResponse.json({ error: first }, { status: 400 });
  }

  const count = await prisma.dishParameterCategory.count({ where: { dishId } });
  const created = await prisma.dishParameterCategory.create({
    data: {
      dishId,
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder ?? count,
      minSelections: parsed.data.minSelections ?? 0,
      maxSelections: parsed.data.maxSelections ?? 1,
    },
    include: { parameters: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(created);
}
