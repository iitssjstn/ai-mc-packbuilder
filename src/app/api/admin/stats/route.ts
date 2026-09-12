import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, isSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;
  const roleError = requireRole(session, "ADMIN", "OWNER");
  if (roleError) return roleError;

  const [totalUsers, totalPacks, packsReady, pluginCount, failedGenerations] = await Promise.all([
    prisma.user.count(),
    prisma.serverPack.count(),
    prisma.serverPack.count({ where: { status: "READY" } }),
    prisma.plugin.count(),
    prisma.serverPack.count({ where: { status: "FAILED" } }),
  ]);

  return NextResponse.json({ totalUsers, totalPacks, packsReady, pluginCount, failedGenerations });
}
