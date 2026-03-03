import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dishParameterCategorySchema } from "@/lib/validation/menu";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ catId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const catId = parseInt((await params).catId);
  if (isNaN(catId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const existing = await prisma.dishParameterCategory.findUnique({ where: { id: catId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }
  const parsed = dishParameterCategorySchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });

  const updated = await prisma.dishParameterCategory.update({
    where: { id: catId },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.sortOrder !== undefined && { sortOrder: parsed.data.sortOrder }),
      ...(parsed.data.minSelections !== undefined && { minSelections: parsed.data.minSelections }),
      ...(parsed.data.maxSelections !== undefined && { maxSelections: parsed.data.maxSelections }),
    },
    include: { parameters: { orderBy: { sortOrder: "asc" } } },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ catId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const catId = parseInt((await params).catId);
  if (isNaN(catId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  await prisma.dishParameterCategory.delete({ where: { id: catId } });
  return NextResponse.json({ ok: true });
}
