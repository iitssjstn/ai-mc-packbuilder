import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSessionUser } from "@/lib/session";
import { modrinthService } from "@/services/ModrinthService";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const importSchema = z.object({
  projectId: z.string().min(1),
  slug: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(128),
  description: z.string().min(1).max(1000),
  author: z.string().max(128).optional(),
});

export async function POST(req: NextRequest) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const parsed = importSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { projectId, slug, title, description, author } = parsed.data;

  const plugin = await prisma.plugin.upsert({
    where: { slug },
    update: {}, // never clobber an admin's existing edits — this only creates if missing
    create: {
      slug,
      name: title,
      description,
      author,
      officialUrl: `https://modrinth.com/plugin/${slug}`,
      documentationUrl: `https://modrinth.com/plugin/${slug}`,
      lastVerifiedAt: new Date(), // the version fetch below is live data, genuinely just-verified
    },
  });

  let versionAdded = false;
  try {
    const best = await modrinthService.fetchBestVersion(projectId);
    if (best) {
      await prisma.pluginVersion.upsert({
        where: { pluginId_version: { pluginId: plugin.id, version: best.versionNumber } },
        update: {},
        create: {
          pluginId: plugin.id,
          version: best.versionNumber,
          minecraftRange: best.minecraftRange,
          compatibleSoftware: best.compatibleSoftware.join(","),
          downloadUrl: best.downloadUrl,
          checksum: best.checksumSha256,
        },
      });
      versionAdded = true;
    }
  } catch {
    // Metadata import already succeeded even if the version/file fetch
    // failed (Modrinth hiccup, unusual file layout, etc.) — surface
    // that instead of failing the whole import.
  }

  await audit(session.id, "plugin_imported_from_modrinth", { slug, versionAdded });
  return NextResponse.json({ slug: plugin.slug, versionAdded }, { status: 201 });
}
