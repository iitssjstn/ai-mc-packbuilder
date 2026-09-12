import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSessionUser } from "@/lib/session";
import { canManageUser } from "@/lib/permissions";
import { Role } from "@/lib/enums";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canManageUser(session.role as Role, target.role as Role)) {
    // Enforced here, not just hidden in the UI — an ADMIN calling this
    // directly against another ADMIN or the OWNER gets rejected the
    // same way a USER would.
    await audit(session.id, "admin_action_rejected", { action: "block", targetUserId: target.id });
    return NextResponse.json({ error: "You do not have permission to manage this account" }, { status: 403 });
  }

  await prisma.user.update({ where: { id: target.id }, data: { isBlocked: true } });
  await audit(session.id, "user_blocked", { targetUserId: target.id });
  return new NextResponse(null, { status: 204 });
}
