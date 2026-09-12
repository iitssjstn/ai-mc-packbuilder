import crypto from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { SoftwareType } from "@/lib/enums";

// Modrinth's API is public and free — no API key required, just a
// descriptive User-Agent per their etiquette guidelines.
// Docs: https://docs.modrinth.com/
const USER_AGENT = "ai-mc-packbuilder/1.0 (server pack builder plugin import)";
const BASE_URL = "https://api.modrinth.com/v2";

interface ModrinthSearchHit {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  author: string;
}

interface ModrinthVersionFile {
  url: string;
  filename: string;
  primary: boolean;
  hashes: { sha1?: string; sha512?: string };
}

interface ModrinthVersion {
  id: string;
  version_number: string;
  game_versions: string[];
  loaders: string[];
  files: ModrinthVersionFile[];
}

const LOADER_TO_SOFTWARE: Record<string, SoftwareType> = {
  paper: "PAPER",
  spigot: "PAPER", // Paper runs Spigot-targeted plugins
  bukkit: "PAPER",
  purpur: "PURPUR",
};

async function modrinthFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Modrinth request failed: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export class ModrinthService {
  async search(query: string): Promise<{ projectId: string; slug: string; title: string; description: string; author: string }[]> {
    const data = await modrinthFetch<{ hits: ModrinthSearchHit[] }>(
      // project_type only allows mod/modpack/resourcepack/shader as a
      // value — "plugin" isn't one of them. all_project_types is the
      // field that actually includes "plugin" (Modrinth's docs list it
      // explicitly under that field, not project_type). Using the wrong
      // field here meant every search silently returned zero hits.
      `/search?query=${encodeURIComponent(query)}&facets=${encodeURIComponent('[["all_project_types:plugin"]]')}&limit=10`
    );
    return data.hits.map((h) => ({
      projectId: h.project_id,
      slug: h.slug,
      title: h.title,
      description: h.description,
      author: h.author,
    }));
  }

  /** Picks the most recent version with a file compatible with Paper or
   * Purpur, downloads that file, and hashes it ourselves — Modrinth
   * only publishes sha1/sha512, but PluginDownloadService verifies
   * sha256, so this is computed fresh rather than converted or guessed. */
  async fetchBestVersion(projectIdOrSlug: string): Promise<{
    versionNumber: string;
    minecraftRange: string;
    compatibleSoftware: SoftwareType[];
    downloadUrl: string;
    checksumSha256: string;
  } | null> {
    const versions = await modrinthFetch<ModrinthVersion[]>(`/project/${projectIdOrSlug}/version`);

    for (const version of versions) {
      const compatibleSoftware = Array.from(
        new Set(version.loaders.map((l) => LOADER_TO_SOFTWARE[l.toLowerCase()]).filter(Boolean))
      ) as SoftwareType[];
      if (compatibleSoftware.length === 0) continue;

      const file = version.files.find((f) => f.primary) ?? version.files[0];
      if (!file) continue;

      const fileRes = await fetch(file.url, { headers: { "User-Agent": USER_AGENT } });
      if (!fileRes.ok) continue;
      const buffer = Buffer.from(await fileRes.arrayBuffer());
      const checksumSha256 = crypto.createHash("sha256").update(buffer).digest("hex");

      const latestGameVersion = version.game_versions[version.game_versions.length - 1] ?? "";
      const minecraftRange = latestGameVersion ? `${latestGameVersion.split(".").slice(0, 2).join(".")}.x` : "unknown";

      return { versionNumber: version.version_number, minecraftRange, compatibleSoftware, downloadUrl: file.url, checksumSha256 };
    }

    return null;
  }

  /** Shared by both the single-import and bulk-import routes: finds the
   * best search hit for a name, then imports it exactly like a manual
   * pick would — same upsert-never-overwrite behavior. */
  async importByName(prisma: PrismaClient, name: string) {
    const hits = await this.search(name);
    const hit = hits[0];
    if (!hit) return { name, status: "not_found" as const };

    const plugin = await prisma.plugin.upsert({
      where: { slug: hit.slug },
      update: {},
      create: {
        slug: hit.slug,
        name: hit.title,
        description: hit.description,
        author: hit.author,
        officialUrl: `https://modrinth.com/plugin/${hit.slug}`,
        documentationUrl: `https://modrinth.com/plugin/${hit.slug}`,
        lastVerifiedAt: new Date(),
      },
    });

    let versionAdded = false;
    try {
      const best = await this.fetchBestVersion(hit.projectId);
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
      // Metadata import already succeeded even if the version/file fetch failed.
    }

    return { name, status: "imported" as const, slug: hit.slug, title: hit.title, versionAdded };
  }
}

export const modrinthService = new ModrinthService();
