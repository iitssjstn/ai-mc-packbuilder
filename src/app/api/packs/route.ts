import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { serverPlanSchema } from "@/schemas/serverPlan.schema";
import { brandingService } from "@/services/BrandingService";
import { env } from "@/lib/env";
import { toJsonValue } from "@/lib/json";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";


export async function GET() {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  const packs = await prisma.serverPack.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      version: true,
      status: true,
      createdAt: true,
      minecraftVersionId: true,
      errorMessage: true,
    },
  });
  return NextResponse.json(packs);
}

// Step 1: create a DRAFT pack from a plan the user confirmed in the AI
// Builder. Nothing is generated yet — this only exists so a logo can be
// attached before generation.
export async function POST(req: NextRequest) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  const parsed = serverPlanSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid server plan", details: parsed.error.issues }, { status: 400 });
  }

  const userId = session.id;
  const existingCount = await prisma.serverPack.count({ where: { userId } });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (existingCount >= (user.packLimit ?? env.MAX_PACKS_PER_USER)) {
    return NextResponse.json({ error: "Pack limit reached for this account" }, { status: 429 });
  }

  const mcVersion = await prisma.minecraftVersion.findUnique({ where: { version: parsed.data.minecraft.version } });
  const software = await prisma.serverSoftware.findUnique({
    where: { type: parsed.data.software.type.toUpperCase() as any },
  });
  if (!mcVersion || !software) {
    return NextResponse.json({ error: "Unknown Minecraft version or server software" }, { status: 400 });
  }

  try {
    brandingService.validateLinks(parsed.data.branding);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }

  const pack = await prisma.serverPack.create({
    data: {
      userId,
      name: parsed.data.server.name,
      minecraftVersionId: mcVersion.id,
      serverSoftwareId: software.id,
      planJson: toJsonValue(parsed.data),
      status: "DRAFT",
    },
  });

  return NextResponse.json({ id: pack.id, status: pack.status }, { status: 201 });
}
