import { prisma } from "@/lib/prisma";
import { SoftwareType } from "@prisma/client";

export class PluginRegistryService {
  async listActiveSlugs(): Promise<string[]> {
    const plugins = await prisma.plugin.findMany({
      where: { isActive: true },
      select: { slug: true },
    });
    return plugins.map((p) => p.slug);
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

    const candidates = plugin.versions.filter(
      (v) =>
        v.compatibleSoftware.includes(software) &&
        (v.minecraftRange === `${rangePrefix}.x` || v.minecraftRange === minecraftVersion)
    );

    // Prefer the most recently added compatible version — not blindly
    // "latest overall", per spec §15.
    candidates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return candidates[0] ?? null;
  }

  async create(data: {
    slug: string;
    name: string;
    description: string;
    officialUrl?: string;
    license?: string;
    configSchema?: unknown;
  }) {
    return prisma.plugin.create({ data: data as any });
  }

  async setActive(slug: string, isActive: boolean) {
    return prisma.plugin.update({ where: { slug }, data: { isActive } });
  }
}

export const pluginRegistryService = new PluginRegistryService();
