import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth, isSessionUser, clearSessionCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { authenticationService } from "@/services/AuthenticationService";
import { rateLimit } from "@/lib/rateLimit";
import { notify } from "@/lib/notifications";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";

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

const updateSchema = z.object({
  currentPassword: z.string().min(1),
  email: z.string().email().optional(),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/).optional(),
  newPassword: z.string().min(10).max(128).optional(),
});

export async function PUT(req: NextRequest) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  if (!rateLimit(`profile-update:${session.id}`, 10, 15 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many attempts, please try again later" }, { status: 429 });
  }

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { currentPassword, ...changes } = parsed.data;

  if (changes.email || changes.username) {
    const conflict = await prisma.user.findFirst({
      where: {
        id: { not: session.id },
        OR: [changes.email ? { email: changes.email } : undefined, changes.username ? { username: changes.username } : undefined].filter(
          Boolean
        ) as any,
      },
    });
    if (conflict) return NextResponse.json({ error: "Email or username already in use" }, { status: 409 });
  }

  try {
    const updated = await authenticationService.updateOwnProfile(session.id, currentPassword, changes);
    if (changes.newPassword) await notify(session.id, "password_changed", "Your password was changed.");
    return NextResponse.json({ id: updated.id, email: updated.email, username: updated.username, role: updated.role });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

const deleteSchema = z.object({ currentPassword: z.string().min(1) });

export async function DELETE(req: NextRequest) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  // The OWNER deleting their own account would leave the platform with
  // no owner at all — that's an admin-level decision (transfer or
  // shut down), not a one-click self-service action.
  if (session.role === "OWNER") {
    return NextResponse.json({ error: "The owner account cannot be self-deleted" }, { status: 403 });
  }

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id } });
  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });

  await prisma.user.delete({ where: { id: session.id } });
  clearSessionCookie();
  return new NextResponse(null, { status: 204 });
}
