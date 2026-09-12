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


export async function GET() {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const plugins = await prisma.plugin.findMany({ include: { versions: true } });
  return NextResponse.json(plugins);
}

const pluginCreateSchema = z.object({
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(128),
  description: z.string().min(1).max(1000),
  officialUrl: z.string().url().optional(),
  license: z.string().max(128).optional(),
});

export async function POST(req: NextRequest) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const parsed = pluginCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const plugin = await pluginRegistryService.create(parsed.data);
  await audit(session.id, "plugin_added", { slug: plugin.slug });
  return NextResponse.json(plugin, { status: 201 });
}
