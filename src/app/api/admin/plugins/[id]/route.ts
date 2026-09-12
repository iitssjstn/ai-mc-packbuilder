import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSessionUser } from "@/lib/session";
import { pluginRegistryService } from "@/services/PluginRegistryService";
import { audit } from "@/lib/audit";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().min(1).max(1000).optional(),
  author: z.string().max(128).optional(),
  officialUrl: z.string().url().optional(),
  documentationUrl: z.string().url().optional(),
  repositoryUrl: z.string().url().optional(),
  category: z.string().max(64).optional(),
  tags: z.string().max(300).optional(),
  license: z.string().max(128).optional(),
  // A boolean flag rather than letting the client send an arbitrary
  // date keeps this an honest "I just checked this" action, not a
  // freely-backdatable field.
  markVerified: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { markVerified, ...fields } = parsed.data;
  const plugin = await pluginRegistryService.update(params.id, {
    ...fields,
    ...(markVerified ? { lastVerifiedAt: new Date() } : {}),
  });
  await audit(session.id, "plugin_modified", { slug: plugin.slug });
  return NextResponse.json(plugin);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const plugin = await prisma.plugin.delete({ where: { id: params.id } });
  await audit(session.id, "plugin_removed", { slug: plugin.slug });
  return new NextResponse(null, { status: 204 });
}
