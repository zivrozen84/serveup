import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) return NextResponse.json({ message: "Invalid ID" }, { status: 400 });

    const body = await request.json();
    const frameUrlRaw = typeof body.frameUrl === "string" ? body.frameUrl : null;
    const frameUrl = frameUrlRaw === "" ? null : frameUrlRaw;
    const frameVariants = typeof body.frameVariants === "string" ? body.frameVariants : undefined;

    const updateData: { frameUrl?: string | null; frameVariants?: string } = {};
    if (frameUrl !== undefined) updateData.frameUrl = frameUrl;
    if (frameVariants !== undefined) updateData.frameVariants = frameVariants;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No data to update" }, { status: 400 });
    }

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(restaurant);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "שגיאת שרת";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
