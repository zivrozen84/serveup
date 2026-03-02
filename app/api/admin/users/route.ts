import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as bcrypt from "bcryptjs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, username: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json();
  const { username, email, password, role } = body;
  if (!username && !email) return NextResponse.json({ error: "שם משתמש או אימייל חובה" }, { status: 400 });
  if (!password || password.length < 6) return NextResponse.json({ error: "סיסמה לפחות 6 תווים" }, { status: 400 });
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.adminUser.create({
    data: {
      username: username || null,
      email: email || null,
      passwordHash: hash,
      role: role || "ADMIN",
    },
    select: { id: true, username: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json(user);
}
