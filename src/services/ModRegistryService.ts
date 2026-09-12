import { prisma } from "@/lib/prisma";

export class ModRegistryService {
  async listActiveSlugs(): Promise<string[]> {
    const mods = await prisma.mod.findMany({ where: { isActive: true }, select: { slug: true } });
    return mods.map((m) => m.slug);
  }

  async getBySlug(slug: string) {
    return prisma.mod.findUnique({
      where: { slug },
      include: {
        versions: true,
        dependsOn: { include: { dependsOn: true } },
        conflictsA: { include: { modB: true } },
        conflictsB: { include: { modA: true } },
      },
    });
  }

  async findCompatibleVersion(slug: string, minecraftVersion: string) {
    const mod = await this.getBySlug(slug);
    if (!mod) return null;
    const [major, minor] = minecraftVersion.split(".");
    const rangePrefix = `${major}.${minor}`;
    const candidates = mod.versions.filter(
      (v) => v.minecraftRange === `${rangePrefix}.x` || v.minecraftRange === minecraftVersion
    );
    candidates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return candidates[0] ?? null;
  }

  async create(data: {
    slug: string;
    name: string;
    description: string;
    loader: "FABRIC" | "FORGE" | "NEOFORGE";
    officialUrl?: string;
    license?: string;
  }) {
    return prisma.mod.create({ data: data as any });
  }

  async setActive(slug: string, isActive: boolean) {
    return prisma.mod.update({ where: { slug }, data: { isActive } });
  }
}

export const modRegistryService = new ModRegistryService();
