import { prisma } from "@/lib/prisma";

export interface ConflictReport {
  hasConflicts: boolean;
  conflicts: { slugA: string; slugB: string; reason: string | null }[];
}

/**
 * Given a final resolved slug list, checks the registry's conflict table
 * for any pair that can't coexist (spec §14). The pack generator refuses
 * to proceed while hasConflicts is true.
 */
export class ConflictService {
  async checkPlugins(slugs: string[]): Promise<ConflictReport> {
    if (slugs.length < 2) return { hasConflicts: false, conflicts: [] };

    const plugins = await prisma.plugin.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true },
    });
    const ids = plugins.map((p) => p.id);
    const idToSlug = new Map(plugins.map((p) => [p.id, p.slug]));

    const rows = await prisma.pluginConflict.findMany({
      where: { pluginAId: { in: ids }, pluginBId: { in: ids } },
    });

    const conflicts = rows.map((r) => ({
      slugA: idToSlug.get(r.pluginAId)!,
      slugB: idToSlug.get(r.pluginBId)!,
      reason: r.reason,
    }));

    return { hasConflicts: conflicts.length > 0, conflicts };
  }

  async checkMods(slugs: string[]): Promise<ConflictReport> {
    if (slugs.length < 2) return { hasConflicts: false, conflicts: [] };

    const mods = await prisma.mod.findMany({
      where: { slug: { in: slugs } },
      select: { id: true, slug: true },
    });
    const ids = mods.map((m) => m.id);
    const idToSlug = new Map(mods.map((m) => [m.id, m.slug]));

    const rows = await prisma.modConflict.findMany({
      where: { modAId: { in: ids }, modBId: { in: ids } },
    });

    const conflicts = rows.map((r) => ({
      slugA: idToSlug.get(r.modAId)!,
      slugB: idToSlug.get(r.modBId)!,
      reason: r.reason,
    }));

    return { hasConflicts: conflicts.length > 0, conflicts };
  }
}

export const conflictService = new ConflictService();
