import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, isSessionUser } from "@/lib/session";
import { canManageUser } from "@/lib/permissions";
import { Role } from "@/lib/enums";
import { audit } from "@/lib/audit";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";


export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;
  const roleError = requireRole(session, "OWNER");
  if (roleError) return roleError;

  if (params.id === session.id) {
    return NextResponse.json({ error: "You cannot delete your own account from the admin panel" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canManageUser(session.role as Role, target.role as Role)) {
    await audit(session.id, "admin_action_rejected", { action: "delete", targetUserId: target.id });
    return NextResponse.json({ error: "You do not have permission to manage this account" }, { status: 403 });
  }

  await prisma.user.delete({ where: { id: target.id } });
  await audit(session.id, "user_deleted", { targetUserId: target.id });
  return new NextResponse(null, { status: 204 });
}
