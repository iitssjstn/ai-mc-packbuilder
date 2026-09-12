import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, isSessionUser } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;
  const roleError = requireRole(session, "OWNER");
  if (roleError) return roleError;

  await prisma.user.delete({ where: { id: params.id } });
  await audit(session.id, "user_deleted", { targetUserId: params.id });
  return new NextResponse(null, { status: 204 });
}
