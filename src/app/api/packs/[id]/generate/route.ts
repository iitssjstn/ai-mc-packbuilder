import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { serverPlanSchema } from "@/schemas/serverPlan.schema";
import { fromJsonString } from "@/lib/json";
import { packGeneratorService, PlanValidationError } from "@/services/PackGeneratorService";
import { rateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";
import { notify } from "@/lib/notifications";
import { creditService } from "@/services/CreditService";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";


// Pack generation (plugin downloads + zipping) can take a while — this
// runs synchronously in the request now that there's no separate worker,
// so give it real headroom. Also raise the reverse-proxy timeout on
// whatever sits in front of this app in production (see deploy docs).
export const maxDuration = 120;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  if (!rateLimit(`generate:${session.id}`, 10, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many generation requests, try again later" }, { status: 429 });
  }

  const pack = await prisma.serverPack.findFirst({ where: { id: params.id, userId: session.id } });
  if (!pack) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pack.status !== "DRAFT" && pack.status !== "FAILED") {
    return NextResponse.json({ error: `Pack is already ${pack.status.toLowerCase()}` }, { status: 409 });
  }

  let storedPlan: unknown;
  try {
    storedPlan = fromJsonString(pack.planJson);
  } catch {
    return NextResponse.json(
      { error: "Stored plan is corrupted — please rebuild it in the AI Builder" },
      { status: 500 }
    );
  }

  const parsed = serverPlanSchema.safeParse(storedPlan);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Stored plan is no longer valid — please rebuild it in the AI Builder" },
      { status: 500 }
    );
  }

  await prisma.serverPack.update({ where: { id: pack.id }, data: { status: "GENERATING", errorMessage: null, generationStep: null } });

  // ADMIN/OWNER operate the platform rather than consume it — no free-
  // tier limit applies to them. Regular users are charged 1 credit per
  // attempt, refunded automatically if generation fails. This is the
  // actual enforcement point for future paid generations too: nothing
  // about "am I allowed to generate" is decided on the frontend.
  const isExemptFromCredits = session.role === "ADMIN" || session.role === "OWNER";
  if (!isExemptFromCredits) {
    try {
      await creditService.chargeForGeneration(session.id, pack.id);
    } catch (err) {
      await prisma.serverPack.update({ where: { id: pack.id }, data: { status: "FAILED", errorMessage: (err as Error).message } });
      return NextResponse.json({ error: (err as Error).message }, { status: 402 });
    }
  }

  try {
    const result = await packGeneratorService.generate(pack.id, parsed.data);
    await prisma.serverPack.update({
      where: { id: pack.id },
      data: { status: "READY", filePath: result.filePath, fileSizeBytes: result.fileSizeBytes, generationStep: null, creditsCost: isExemptFromCredits ? 0 : 1 },
    });
    await notify(session.id, "pack_ready", `"${pack.name}" is ready to download.`);
    return NextResponse.json({ id: pack.id, status: "READY" });
  } catch (err) {
    const message = err instanceof PlanValidationError ? err.issues.join(" | ") : "Pack generation failed";
    logger.error({ packId: pack.id, err }, "Pack generation failed");
    if (!isExemptFromCredits) await creditService.refundGeneration(session.id, pack.id);
    await prisma.serverPack.update({ where: { id: pack.id }, data: { status: "FAILED", errorMessage: message, generationStep: null } });
    await notify(session.id, "pack_failed", `"${pack.name}" failed to generate: ${message}`);
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
