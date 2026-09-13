import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSessionUser } from "@/lib/session";
import { audit } from "@/lib/audit";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { versionId: string } }) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  await prisma.pluginVersion.delete({ where: { id: params.versionId } });
  await audit(session.id, "plugin_version_removed", { versionId: params.versionId });
  return new NextResponse(null, { status: 204 });
}

// Seeding never overwrites an existing version row (by design — it must
// never clobber an admin's own edits), which also means a stale or wrong
// value from an old seed run can never self-heal on redeploy. This is
// the way to actually fix one: minecraftRange in particular ("1.21" vs
// "1.21.x" vs a typo) is otherwise invisible and permanent.
const patchSchema = z.object({
  minecraftRange: z.string().min(1).max(32).optional(),
  compatibleSoftware: z.array(z.enum(["PAPER", "PURPUR"])).min(1).optional(),
  downloadUrl: z.string().url().optional(),
  checksum: z.string().regex(/^[a-fA-F0-9]{64}$/).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string; versionId: string } }) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const version = await prisma.pluginVersion.findFirst({ where: { id: params.versionId, pluginId: params.id } });
  if (!version) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.pluginVersion.update({
    where: { id: version.id },
    data: {
      minecraftRange: parsed.data.minecraftRange,
      compatibleSoftware: parsed.data.compatibleSoftware?.join(","),
      downloadUrl: parsed.data.downloadUrl,
      checksum: parsed.data.checksum,
    },
  });

  await audit(session.id, "plugin_version_edited", { pluginId: params.id, versionId: version.id });
  return NextResponse.json(updated);
}
