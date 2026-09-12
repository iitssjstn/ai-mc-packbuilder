import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSessionUser } from "@/lib/session";
import { audit } from "@/lib/audit";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";


const pluginVersionSchema = z.object({
  version: z.string().min(1).max(32),
  minecraftRange: z.string().min(1).max(16),
  compatibleSoftware: z.array(z.enum(["VANILLA", "PAPER", "PURPUR"])).min(1),
  downloadUrl: z.string().url(),
  checksum: z.string().regex(/^[a-f0-9]{64}$/i, "Expected a 64-character hex SHA-256 checksum"),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const parsed = pluginVersionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const plugin = await prisma.plugin.findUnique({ where: { id: params.id } });
  if (!plugin) return NextResponse.json({ error: "Plugin not found" }, { status: 404 });

  const { compatibleSoftware, ...rest } = parsed.data;
  const version = await prisma.pluginVersion.create({
    data: { pluginId: plugin.id, ...rest, compatibleSoftware: compatibleSoftware.join(",") },
  });
  await audit(session.id, "plugin_version_added", { slug: plugin.slug, version: version.version });
  return NextResponse.json(version, { status: 201 });
}
