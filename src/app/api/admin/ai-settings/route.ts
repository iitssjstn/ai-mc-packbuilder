import { NextResponse } from "next/server";
import { requireAuth, requireRole, isSessionUser } from "@/lib/session";
import { aiSettingsService } from "@/services/AiSettingsService";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";


export async function GET() {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;
  const roleError = requireRole(session, "OWNER");
  if (roleError) return roleError;

  const settings = await aiSettingsService.getMaskedSettings();
  return NextResponse.json(settings);
}
