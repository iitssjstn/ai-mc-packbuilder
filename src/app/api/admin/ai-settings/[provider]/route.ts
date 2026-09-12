import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole, isSessionUser } from "@/lib/session";
import { aiSettingsService, PROVIDERS, ProviderName } from "@/services/AiSettingsService";
import { audit } from "@/lib/audit";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";


const keysSchema = z.object({
  // Comma-separated keys, or an empty string to clear the database
  // override and fall back to env/Docker-secrets again.
  keys: z.string().max(10_000),
});

export async function PUT(req: NextRequest, { params }: { params: { provider: string } }) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;
  const roleError = requireRole(session, "OWNER");
  if (roleError) return roleError;

  if (!PROVIDERS.includes(params.provider as ProviderName)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }
  const provider = params.provider as ProviderName;

  const parsed = keysSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    await aiSettingsService.updateProviderKeys(provider, parsed.data.keys);
  } catch (err) {
    // Most likely cause: ENCRYPTION_KEY isn't configured yet.
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  // Never log the actual key values — only which provider changed and
  // whether keys are now present, not their content.
  await audit(session.id, "ai_provider_keys_updated", {
    provider,
    cleared: parsed.data.keys.trim().length === 0,
  });

  return new NextResponse(null, { status: 204 });
}
