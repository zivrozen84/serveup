import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: idParam } = await params;
  const id = parseInt(idParam);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  await prisma.adminUser.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
