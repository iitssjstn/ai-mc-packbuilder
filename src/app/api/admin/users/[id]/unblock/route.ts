import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSessionUser } from "@/lib/session";
import { audit } from "@/lib/audit";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";


export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  await prisma.user.update({ where: { id: params.id }, data: { isBlocked: false } });
  await audit(session.id, "user_unblocked", { targetUserId: params.id });
  return new NextResponse(null, { status: 204 });
}
