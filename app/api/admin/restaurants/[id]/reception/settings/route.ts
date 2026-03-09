import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt((await params).id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const r = await prisma.restaurant.findUnique({
    where: { id },
    select: {
      receptionDontNotifyReady: true,
      receptionAutoDeleteMinutes: true,
      receptionAlertAfterMinutes: true,
    },
  });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    receptionDontNotifyReady: r.receptionDontNotifyReady ?? false,
    receptionAutoDeleteMinutes: r.receptionAutoDeleteMinutes ?? 30,
    receptionAlertAfterMinutes: r.receptionAlertAfterMinutes ?? 10,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = parseInt((await params).id, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  let body: {
    receptionDontNotifyReady?: boolean;
    receptionAutoDeleteMinutes?: number;
    receptionAlertAfterMinutes?: number;
  } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data: {
    receptionDontNotifyReady?: boolean;
    receptionAutoDeleteMinutes?: number | null;
    receptionAlertAfterMinutes?: number | null;
  } = {};
  if (typeof body.receptionDontNotifyReady === "boolean")
    data.receptionDontNotifyReady = body.receptionDontNotifyReady;
  if (body.receptionAutoDeleteMinutes !== undefined) {
    const n = Number(body.receptionAutoDeleteMinutes);
    data.receptionAutoDeleteMinutes = Number.isFinite(n) && n >= 1 ? n : null;
  }
  if (body.receptionAlertAfterMinutes !== undefined) {
    const n = Number(body.receptionAlertAfterMinutes);
    data.receptionAlertAfterMinutes = Number.isFinite(n) && n >= 1 ? n : null;
  }

  await prisma.restaurant.update({
    where: { id },
    data,
  });

  return NextResponse.json({ ok: true });
}
