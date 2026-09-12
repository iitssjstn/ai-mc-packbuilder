import { NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  await prisma.notification.updateMany({ where: { userId: session.id, read: false }, data: { read: true } });
  return new NextResponse(null, { status: 204 });
}
