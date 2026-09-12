import { NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, email: true, username: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(user);
}
