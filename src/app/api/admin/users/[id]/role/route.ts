import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, isSessionUser } from "@/lib/session";
import { canChangeRole } from "@/lib/permissions";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Role changes are OWNER-only, full stop — an ADMIN cannot promote
// anyone (including to ADMIN), demote another ADMIN, or touch OWNER.
const roleSchema = z.object({ role: z.enum(["USER", "ADMIN"]) }); // promoting to OWNER isn't offered via this route at all

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;
  const roleError = requireRole(session, "OWNER");
  if (roleError) return roleError;

  if (!canChangeRole(session.role)) {
    return NextResponse.json({ error: "You do not have permission to change roles" }, { status: 403 });
  }

  const parsed = roleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (target.role === "OWNER") {
    return NextResponse.json({ error: "The owner's role cannot be changed" }, { status: 403 });
  }

  const updated = await prisma.user.update({ where: { id: target.id }, data: { role: parsed.data.role } });
  await audit(session.id, "user_role_changed", { targetUserId: target.id, newRole: parsed.data.role });
  return NextResponse.json({ id: updated.id, role: updated.role });
}
