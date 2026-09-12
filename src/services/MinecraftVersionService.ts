import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const MOJANG_MANIFEST_URL = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";

export class MinecraftVersionService {
  async list() {
    return prisma.minecraftVersion.findMany({
      where: { isSupported: true },
      orderBy: { version: "desc" },
    });
  }

  /**
   * Pulls the official Mojang version manifest and upserts "release" type
   * entries (spec §3: use a reliable external source instead of a
   * hardcoded list). Run this periodically (e.g. daily cron) rather than
   * on every request.
   */
  async syncFromMojang() {
    const res = await fetch(MOJANG_MANIFEST_URL);
    if (!res.ok) throw new Error(`Failed to fetch Mojang version manifest: HTTP ${res.status}`);
    const manifest = await res.json();

    const releases = manifest.versions.filter((v: any) => v.type === "release");
    let created = 0;
    for (const v of releases) {
      const result = await prisma.minecraftVersion.upsert({
        where: { version: v.id },
        update: {},
        create: { version: v.id, edition: "java", releasedAt: new Date(v.releaseTime) },
      });
      if (result) created++;
    }
    logger.info({ count: releases.length }, "Synced Minecraft versions from Mojang manifest");
    return releases.length;
  }
}

export const minecraftVersionService = new MinecraftVersionService();
