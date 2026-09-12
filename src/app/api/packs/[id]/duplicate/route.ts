import { NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  const source = await prisma.serverPack.findFirst({ where: { id: params.id, userId: session.id } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id } });
  const existingCount = await prisma.serverPack.count({ where: { userId: session.id } });
  if (existingCount >= (user.packLimit ?? env.MAX_PACKS_PER_USER)) {
    return NextResponse.json({ error: "Pack limit reached for this account" }, { status: 429 });
  }

  // Duplicates the plan and branding, always as a fresh DRAFT — never
  // copies the generated file itself, since that belongs to a specific
  // build and shouldn't be silently reused under a new pack's identity.
  const copy = await prisma.serverPack.create({
    data: {
      userId: session.id,
      name: `${source.name} (copy)`,
      minecraftVersionId: source.minecraftVersionId,
      serverSoftwareId: source.serverSoftwareId,
      planJson: source.planJson,
      status: "DRAFT",
    },
  });

  return NextResponse.json({ id: copy.id, name: copy.name, status: copy.status }, { status: 201 });
}
