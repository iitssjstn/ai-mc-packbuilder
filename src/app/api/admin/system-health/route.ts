import { NextResponse } from "next/server";
import fs from "node:fs";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, isSessionUser } from "@/lib/session";
import { aiSettingsService } from "@/services/AiSettingsService";
import { env } from "@/lib/env";
import type { HealthStatus } from "@/lib/enums";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";

interface Check {
  name: string;
  status: HealthStatus;
  detail: string;
}

export async function GET() {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;
  const roleError = requireRole(session, "ADMIN", "OWNER");
  if (roleError) return roleError;

  const checks: Check[] = [];

  // Database
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({ name: "Database", status: "healthy", detail: "Reachable" });
  } catch (err) {
    checks.push({ name: "Database", status: "error", detail: (err as Error).message });
  }

  // AI providers — at least one configured key across all providers
  try {
    const settings = await aiSettingsService.getMaskedSettings();
    const totalKeys = Object.values(settings.providers).reduce((sum, p) => sum + p.count, 0);
    checks.push({
      name: "AI providers",
      status: totalKeys > 0 ? "healthy" : "warning",
      detail: totalKeys > 0 ? `${totalKeys} key(s) configured` : "No AI provider keys configured",
    });
  } catch (err) {
    checks.push({ name: "AI providers", status: "error", detail: (err as Error).message });
  }

  // Plugin registry
  try {
    const [total, active] = await Promise.all([
      prisma.plugin.count(),
      prisma.plugin.count({ where: { isActive: true } }),
    ]);
    checks.push({
      name: "Plugin registry",
      status: active > 0 ? "healthy" : "warning",
      detail: `${active} active / ${total} total`,
    });
  } catch (err) {
    checks.push({ name: "Plugin registry", status: "error", detail: (err as Error).message });
  }

  // Storage — data directory writable
  try {
    const testFile = `${env.STORAGE_LOCAL_PATH}/.health-check`;
    fs.writeFileSync(testFile, "ok");
    fs.unlinkSync(testFile);
    checks.push({ name: "Storage", status: "healthy", detail: env.STORAGE_LOCAL_PATH });
  } catch (err) {
    checks.push({ name: "Storage", status: "error", detail: (err as Error).message });
  }

  // Pack generation — recent failure rate
  try {
    const [recentTotal, recentFailed] = await Promise.all([
      prisma.serverPack.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      prisma.serverPack.count({
        where: { status: "FAILED", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      }),
    ]);
    checks.push({
      name: "Pack generation (24h)",
      status: recentTotal === 0 || recentFailed / Math.max(recentTotal, 1) < 0.3 ? "healthy" : "warning",
      detail: `${recentFailed} failed / ${recentTotal} total`,
    });
  } catch (err) {
    checks.push({ name: "Pack generation (24h)", status: "error", detail: (err as Error).message });
  }

  return NextResponse.json({ checks });
}
