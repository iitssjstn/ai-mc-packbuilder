import { NextResponse } from "next/server";
import { requireAuth, requireRole, isSessionUser } from "@/lib/session";
import { aiSettingsService } from "@/services/AiSettingsService";

export async function GET() {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;
  const roleError = requireRole(session, "OWNER");
  if (roleError) return roleError;

  const settings = await aiSettingsService.getMaskedSettings();
  return NextResponse.json(settings);
}
