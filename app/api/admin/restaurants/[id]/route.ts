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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }
  const parsed = restaurantSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const existing = await prisma.restaurant.findFirst({ where: { slug: data.slug, NOT: { id } } });
  if (existing) return NextResponse.json({ error: "Slug כבר קיים" }, { status: 400 });

  try {
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
        categoryTextColor: data.categoryTextColor ?? null,
        secondaryColor: data.secondaryColor ?? null,
        textColor: data.textColor ?? null,
        descriptionColor: data.descriptionColor ?? null,
        priceColor: data.priceColor ?? null,
      cartColor: data.cartColor ?? null,
      cartTextColor: data.cartTextColor ?? null,
      cartBackgroundUrl: data.cartBackgroundUrl && data.cartBackgroundUrl !== "" ? data.cartBackgroundUrl : null,
      cartBarOverlayOpacity: data.cartBarOverlayOpacity != null ? Number(data.cartBarOverlayOpacity) : null,
      cartBarControlsOpacity: data.cartBarControlsOpacity != null ? Number(data.cartBarControlsOpacity) : null,
      bottomNavColor: data.bottomNavColor ?? null,
      bottomNavIconColor: data.bottomNavIconColor ?? null,
      menuDisplayFormat: data.menuDisplayFormat ?? "large",
        isActive: data.isActive ?? true,
        logoUrl: data.logoUrl ?? null,
        bannerUrl: data.bannerUrl ?? null,
        backgroundUrl: data.backgroundUrl ?? null,
        frameUrl: data.frameUrl ?? null,
        frameVariants: data.frameVariants ?? null,
        textSize: data.textSize ?? 16,
        fontFamily: data.fontFamily ?? null,
      },
    });
    return NextResponse.json(restaurant);
  } catch (err) {
    console.error("Restaurant PUT error:", err);
    return NextResponse.json({ error: "שגיאה בשמירת המסעדה" }, { status: 500 });
  }
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
  const menuDisplayFormat = ["large", "small", "compact", "imageRight"].includes(body.menuDisplayFormat) ? body.menuDisplayFormat : undefined;
  const textSize = typeof body.textSize === "number" && body.textSize >= 10 && body.textSize <= 32 ? body.textSize : undefined;
  const fontFamily = body.fontFamily !== undefined ? (body.fontFamily === null || body.fontFamily === "" ? null : String(body.fontFamily)) : undefined;

  const restaurant = await prisma.restaurant.update({
    where: { id },
    data: {
      ...(frameUrl !== null && { frameUrl }),
      ...(frameVariants !== undefined && { frameVariants }),
      ...(menuDisplayFormat !== undefined && { menuDisplayFormat }),
      ...(textSize !== undefined && { textSize }),
      ...(fontFamily !== undefined && { fontFamily }),
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
