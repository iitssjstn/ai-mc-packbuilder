import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

/**
 * Starter registry data so the AI Builder has something real to work with
 * out of the box. Download URLs/checksums below are PLACEHOLDERS —
 * an admin must fill in real, verified download sources and checksums via
 * the admin panel before these plugins can actually be bundled into a pack
 * (PackGeneratorService refuses to fetch a plugin with no verified source).
 */

const MC_VERSIONS = ["1.20.4", "1.20.6", "1.21.4", "1.21.5", "1.21.6", "1.21.7", "1.21.8"];

const PLUGINS: Array<{
  slug: string;
  name: string;
  description: string;
  officialUrl: string;
  license: string;
  versions: { version: string; minecraftRange: string; software: Array<"PAPER" | "PURPUR"> }[];
  dependsOn?: string[];
}> = [
  {
    slug: "essentialsx",
    name: "EssentialsX",
    description: "Core server commands: homes, teleportation, kits, warps, spawn.",
    officialUrl: "https://essentialsx.net/",
    license: "GPL-3.0",
    versions: [{ version: "2.20.1", minecraftRange: "1.21.x", software: ["PAPER", "PURPUR"] }],
  },
  {
    slug: "luckperms",
    name: "LuckPerms",
    description: "Permissions and ranks management.",
    officialUrl: "https://luckperms.net/",
    license: "MIT",
    versions: [{ version: "5.4.130", minecraftRange: "1.21.x", software: ["PAPER", "PURPUR"] }],
  },
  {
    slug: "vault",
    name: "Vault",
    description: "Economy/permissions API bridge used by many other plugins.",
    officialUrl: "https://www.spigotmc.org/resources/vault.34315/",
    license: "MIT",
    versions: [{ version: "1.7.3", minecraftRange: "1.21.x", software: ["PAPER", "PURPUR"] }],
  },
  {
    slug: "griefprevention",
    name: "GriefPrevention",
    description: "Land claims to protect player builds.",
    officialUrl: "https://github.com/GriefPrevention/GriefPrevention",
    license: "MIT",
    versions: [{ version: "17.0.0", minecraftRange: "1.21.x", software: ["PAPER", "PURPUR"] }],
  },
  {
    slug: "economyshopgui",
    name: "EconomyShopGUI",
    description: "GUI-based buy/sell shop system.",
    officialUrl: "https://www.spigotmc.org/resources/economyshopgui.69927/",
    license: "Proprietary (free tier)",
    versions: [{ version: "5.9.0", minecraftRange: "1.21.x", software: ["PAPER", "PURPUR"] }],
    dependsOn: ["vault"],
  },
];

async function main() {
  logger.info("Seeding Minecraft versions...");
  for (const version of MC_VERSIONS) {
    await prisma.minecraftVersion.upsert({
      where: { version },
      update: {},
      create: { version, edition: "java" },
    });
  }

  logger.info("Seeding server software...");
  const paper = await prisma.serverSoftware.upsert({
    where: { type: "PAPER" },
    update: {},
    create: { type: "PAPER", kind: "PLUGIN_BASED", name: "Paper" },
  });
  await prisma.serverSoftware.upsert({
    where: { type: "PURPUR" },
    update: {},
    create: { type: "PURPUR", kind: "PLUGIN_BASED", name: "Purpur" },
  });
  await prisma.serverSoftware.upsert({
    where: { type: "VANILLA" },
    update: {},
    create: { type: "VANILLA", kind: "PLUGIN_BASED", name: "Vanilla" },
  });
  await prisma.serverSoftware.upsert({
    where: { type: "FABRIC" },
    update: {},
    create: { type: "FABRIC", kind: "MOD_BASED", name: "Fabric" },
  });

  logger.info("Seeding plugins...");
  for (const p of PLUGINS) {
    const plugin = await prisma.plugin.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        officialUrl: p.officialUrl,
        license: p.license,
      },
    });

    for (const v of p.versions) {
      await prisma.pluginVersion.upsert({
        where: { pluginId_version: { pluginId: plugin.id, version: v.version } },
        update: {},
        create: {
          pluginId: plugin.id,
          version: v.version,
          minecraftRange: v.minecraftRange,
          compatibleSoftware: v.software,
          // PLACEHOLDER — admin must set a real, verified download URL + checksum.
          downloadUrl: "",
          checksum: null,
        },
      });
    }
  }

  logger.info("Seeding plugin dependencies...");
  for (const p of PLUGINS) {
    if (!p.dependsOn) continue;
    const plugin = await prisma.plugin.findUniqueOrThrow({ where: { slug: p.slug } });
    for (const depSlug of p.dependsOn) {
      const dep = await prisma.plugin.findUniqueOrThrow({ where: { slug: depSlug } });
      await prisma.pluginDependency.upsert({
        where: { pluginId_dependsOnId: { pluginId: plugin.id, dependsOnId: dep.id } },
        update: {},
        create: { pluginId: plugin.id, dependsOnId: dep.id },
      });
    }
  }

  logger.info("Seed complete. Remember: download URLs are placeholders — fill in real, verified sources via the admin panel before generating real packs.");
}

main()
  .catch((err) => {
    logger.error(err, "Seed failed");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
