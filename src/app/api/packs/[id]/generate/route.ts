import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { serverPlanSchema } from "@/schemas/serverPlan.schema";
import { packGeneratorService, PlanValidationError } from "@/services/PackGeneratorService";
import { rateLimit } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

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

  const parsed = serverPlanSchema.safeParse(pack.planJson);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Stored plan is no longer valid — please rebuild it in the AI Builder" },
      { status: 500 }
    );
  }

  await prisma.serverPack.update({ where: { id: pack.id }, data: { status: "GENERATING", errorMessage: null } });

  try {
    const result = await packGeneratorService.generate(pack.id, parsed.data);
    await prisma.serverPack.update({
      where: { id: pack.id },
      data: { status: "READY", filePath: result.filePath, fileSizeBytes: result.fileSizeBytes },
    });
    return NextResponse.json({ id: pack.id, status: "READY" });
  } catch (err) {
    const message = err instanceof PlanValidationError ? err.issues.join(" | ") : "Pack generation failed";
    logger.error({ packId: pack.id, err }, "Pack generation failed");
    await prisma.serverPack.update({ where: { id: pack.id }, data: { status: "FAILED", errorMessage: message } });
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
