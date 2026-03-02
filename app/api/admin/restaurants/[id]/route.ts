import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { restaurantSchema } from "@/lib/validation/restaurant";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idParam } = await params;
  const id = parseInt(idParam);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const restaurant = await prisma.restaurant.findUnique({
    where: { id },
    include: { categories: { include: { dishes: true }, orderBy: { sortOrder: "asc" } }, tables: true },
  });
  if (!restaurant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(restaurant);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idParam } = await params;
  const id = parseInt(idParam);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await request.json();
  const parsed = restaurantSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const existing = await prisma.restaurant.findFirst({ where: { slug: data.slug, NOT: { id } } });
  if (existing) return NextResponse.json({ error: "Slug כבר קיים" }, { status: 400 });

  const restaurant = await prisma.restaurant.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.slug,
      ownerName: data.ownerName,
      ownerEmail: data.ownerEmail,
      ownerPhone: data.ownerPhone,
      city: data.city,
      primaryColor: data.primaryColor ?? "#c2410c",
      isActive: data.isActive ?? true,
      logoUrl: data.logoUrl ?? null,
      bannerUrl: data.bannerUrl ?? null,
      backgroundUrl: data.backgroundUrl ?? null,
      frameUrl: data.frameUrl ?? null,
      frameVariants: data.frameVariants ?? null,
    },
  });
  return NextResponse.json(restaurant);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idParam } = await params;
  const id = parseInt(idParam);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const body = await request.json();
  const frameUrl = typeof body.frameUrl === "string" ? body.frameUrl : null;
  const frameVariants = typeof body.frameVariants === "string" ? body.frameVariants : undefined;

  const restaurant = await prisma.restaurant.update({
    where: { id },
    data: {
      ...(frameUrl !== null && { frameUrl }),
      ...(frameVariants !== undefined && { frameVariants }),
    },
  });
  return NextResponse.json(restaurant);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: idParam } = await params;
  const id = parseInt(idParam);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  await prisma.restaurant.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
