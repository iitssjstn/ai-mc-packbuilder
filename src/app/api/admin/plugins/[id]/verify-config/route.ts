import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSessionUser } from "@/lib/session";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const plugin = await prisma.plugin.findUnique({ where: { id: params.id } });
  if (!plugin) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!plugin.configSchema) {
    return NextResponse.json({ error: "No discovered config schema to verify yet" }, { status: 400 });
  }

  const updated = await prisma.plugin.update({ where: { id: plugin.id }, data: { configSchemaVerified: true } });
  await audit(session.id, "plugin_config_verified", { pluginId: plugin.id, slug: plugin.slug });
  return NextResponse.json({ configSchemaVerified: updated.configSchemaVerified });
}
