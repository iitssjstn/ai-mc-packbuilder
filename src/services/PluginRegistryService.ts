import { prisma } from "@/lib/prisma";
import { SoftwareType } from "@/lib/enums";

export class PluginRegistryService {
  async listActiveSlugs(): Promise<string[]> {
    const plugins = await prisma.plugin.findMany({
      where: { isActive: true },
      select: { slug: true },
    });
    return plugins.map((p) => p.slug);
  }

  /** Only plugins with an admin-verified configSchema — this is what the
   * AI is told it may safely propose configOverrides for. */
  async listVerifiedConfigSchemas(): Promise<{ slug: string; properties: Record<string, unknown> }[]> {
    const plugins = await prisma.plugin.findMany({
      where: { isActive: true, configSchemaVerified: true, configSchema: { not: null } },
      select: { slug: true, configSchema: true },
    });
    return plugins.flatMap((p) => {
      try {
        const parsed = JSON.parse(p.configSchema!);
        return [{ slug: p.slug, properties: parsed.properties ?? {} }];
      } catch {
        return [];
      }
    });
  }

  async getBySlug(slug: string) {
    return prisma.plugin.findUnique({
      where: { slug },
      include: {
        versions: true,
        dependsOn: { include: { dependsOn: true } },
        conflictsA: { include: { pluginB: true } },
        conflictsB: { include: { pluginA: true } },
      },
    });
  }

  /** Finds the best plugin version for a given Minecraft version + software. */
  async findCompatibleVersion(slug: string, minecraftVersion: string, software: SoftwareType) {
    const plugin = await this.getBySlug(slug);
    if (!plugin) return null;

    const [major, minor] = minecraftVersion.split(".");
    const rangePrefix = `${major}.${minor}`;

    // Accept a stored range in either "1.21" or "1.21.x" form as meaning
    // the same thing (any patch version of 1.21) — a version row created
    // by hand (or from an older seed run that predates the ".x"
    // convention) shouldn't silently stop matching just because it's
    // missing a trailing ".x" that was never actually a hard requirement.
    // Software names are also compared case-insensitively and trimmed,
    // since a hand-edited comma list is an easy place for stray
    // whitespace/casing to creep in.
    const candidates = plugin.versions.filter((v) => {
      const softwareList = v.compatibleSoftware.split(",").map((s) => s.trim().toUpperCase());
      if (!softwareList.includes(software)) return false;

      const range = v.minecraftRange.trim();
      const normalizedRange = range.endsWith(".x") ? range.slice(0, -2) : range;
      return normalizedRange === rangePrefix || range === minecraftVersion;
    });

    // Prefer the most recently added compatible version — not blindly
    // "latest overall", per spec §15.
    candidates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return candidates[0] ?? null;
  }

  async create(data: {
    slug: string;
    name: string;
    description: string;
    author?: string;
    officialUrl?: string;
    documentationUrl?: string;
    repositoryUrl?: string;
    category?: string;
    tags?: string;
    license?: string;
    configSchema?: unknown;
  }) {
    return prisma.plugin.create({ data: data as any });
  }

  /** Admin edit of an existing plugin's metadata — separate from the
   * isActive toggle (its own route) since that's a much more frequent,
   * lower-stakes action. */
  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      author: string;
      officialUrl: string;
      documentationUrl: string;
      repositoryUrl: string;
      category: string;
      tags: string;
      license: string;
      lastVerifiedAt: Date;
    }>
  ) {
    return prisma.plugin.update({ where: { id }, data: data as any });
  }

  async setActive(slug: string, isActive: boolean) {
    return prisma.plugin.update({ where: { slug }, data: { isActive } });
  }
}

export const pluginRegistryService = new PluginRegistryService();
