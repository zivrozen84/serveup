import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dishParameterSchema } from "@/lib/validation/menu";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ paramId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const paramId = parseInt((await params).paramId);
  if (isNaN(paramId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const existing = await prisma.dishParameter.findUnique({ where: { id: paramId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }
  const parsed = dishParameterSchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "נתונים לא תקינים" }, { status: 400 });

  const updated = await prisma.dishParameter.update({
    where: { id: paramId },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.sortOrder !== undefined && { sortOrder: parsed.data.sortOrder }),
      ...(parsed.data.priceCents !== undefined && { priceCents: parsed.data.priceCents }),
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ paramId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const paramId = parseInt((await params).paramId);
  if (isNaN(paramId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  await prisma.dishParameter.delete({ where: { id: paramId } });
  return NextResponse.json({ ok: true });
}
