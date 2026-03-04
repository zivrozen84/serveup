import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { restaurantSchema } from "@/lib/validation/restaurant";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const restaurants = await prisma.restaurant.findMany({
    orderBy: { createdAt: "desc" },
    include: { categories: true },
  });
  return NextResponse.json(restaurants);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = restaurantSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const existing = await prisma.restaurant.findUnique({ where: { slug: data.slug } });
  if (existing) return NextResponse.json({ error: "Slug כבר קיים" }, { status: 400 });

  const restaurant = await prisma.restaurant.create({
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
      expansionBackdropOpacity: data.expansionBackdropOpacity != null ? Number(data.expansionBackdropOpacity) : null,
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
}
