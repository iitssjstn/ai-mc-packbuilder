import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSessionUser } from "@/lib/session";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";


export async function GET() {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, username: true, role: true, isBlocked: true, packLimit: true, createdAt: true },
  });
  return NextResponse.json(users);
}
