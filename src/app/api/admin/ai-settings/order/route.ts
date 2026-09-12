import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, requireRole, isSessionUser } from "@/lib/session";
import { aiSettingsService, PROVIDERS } from "@/services/AiSettingsService";
import { audit } from "@/lib/audit";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";


const orderSchema = z.object({
  order: z.array(z.enum(PROVIDERS)).min(1),
});

export async function PUT(req: NextRequest) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;
  const roleError = requireRole(session, "OWNER");
  if (roleError) return roleError;

  const parsed = orderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await aiSettingsService.updateOrder(parsed.data.order);
  // Never log the keys themselves — only that an order change happened.
  await audit(session.id, "ai_provider_order_updated", { order: parsed.data.order });

  return new NextResponse(null, { status: 204 });
}
