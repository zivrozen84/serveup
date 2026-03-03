import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dishParameterSchema } from "@/lib/validation/menu";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ catId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const catId = parseInt((await params).catId);
  if (isNaN(catId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const category = await prisma.dishParameterCategory.findUnique({ where: { id: catId } });
  if (!category) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }
  const parsed = dishParameterSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });

  const count = await prisma.dishParameter.count({ where: { categoryId: catId } });
  const created = await prisma.dishParameter.create({
    data: {
      categoryId: catId,
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder ?? count,
      priceCents: parsed.data.priceCents ?? 0,
    },
  });
  return NextResponse.json(created);
}
