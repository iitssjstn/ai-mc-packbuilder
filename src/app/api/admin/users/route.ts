import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSessionUser } from "@/lib/session";

export async function GET() {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const users = await prisma.user.findMany({
    select: { id: true, email: true, username: true, role: true, isBlocked: true, packLimit: true, createdAt: true },
  });
  return NextResponse.json(users);
}
