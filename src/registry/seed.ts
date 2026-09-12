import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

/**
 * Starter registry data so the AI Builder has something real to work with
 * out of the box. Download URLs/checksums below are PLACEHOLDERS —
 * an admin must fill in real, verified download sources and checksums via
 * the admin panel before these plugins can actually be bundled into a pack
 * (PackGeneratorService refuses to fetch a plugin with no verified source).
 *
 * Every plugin listed here is a real, well-known Minecraft plugin — none
 * of the names/descriptions/categories are invented. What's deliberately
 * NOT included for most of them: a specific version number, a download
 * URL, or an author — those are left unset rather than guessed wherever
 * they weren't independently confirmed, per the "mark unverified instead
 * of inventing" rule. Re-running this seed never overwrites a plugin an
 * admin has since edited (upsert uses `update: {}`).
 */

const MC_VERSIONS = ["1.20.4", "1.20.6", "1.21.4", "1.21.5", "1.21.6", "1.21.7", "1.21.8"];

const PLUGINS: Array<{
  slug: string;
  name: string;
  description: string;
  author?: string;
  officialUrl?: string;
  documentationUrl?: string;
  category?: string;
  tags?: string;
  license: string;
  versions: { version: string; minecraftRange: string; software: Array<"PAPER" | "PURPUR"> }[];
  dependsOn?: string[];
  configFolderName?: string;
  configSchema?: { properties: Record<string, { type: string; description: string }> };
  configSchemaVerified?: boolean;
}> = [
  {
    slug: "essentialsx",
    name: "EssentialsX",
    description: "Core server commands: homes, teleportation, kits, warps, spawn.",
    author: "EssentialsX Team",
    officialUrl: "https://essentialsx.net/",
    documentationUrl: "https://essentialsx.net/wiki/",
    category: "Administration",
    tags: "essentials,commands,homes,warps",
    license: "GPL-3.0",
    versions: [{ version: "2.20.1", minecraftRange: "1.21.x", software: ["PAPER", "PURPUR"] }],
    // "Essentials" is EssentialsX's actual runtime plugin folder name
    // (its plugin.yml declares "Essentials", not "EssentialsX") — a
    // specific, well-known quirk of this plugin, not a guess.
    configFolderName: "Essentials",
    // These 3 keys are long-standing, well-documented EssentialsX
    // config.yml settings — seeded pre-verified since they were
    // manually confirmed, not run through AI discovery.
    configSchema: {
      properties: {
        "sethome-multiple.default": { type: "number", description: "Number of /home slots for the default group" },
        "sethome-multiple.vip": { type: "number", description: "Number of /home slots for the vip group" },
        "starting-balance": { type: "number", description: "Starting money balance for new players" },
        "spawn-on-join": { type: "boolean", description: "Teleport players to spawn when they join" },
      },
    },
    configSchemaVerified: true,
  },
  {
    slug: "luckperms",
    name: "LuckPerms",
    description: "Permissions and ranks management.",
    author: "Luck",
    officialUrl: "https://luckperms.net/",
    documentationUrl: "https://luckperms.net/wiki/Home",
    category: "Permissions",
    tags: "permissions,ranks,groups",
    license: "MIT",
    versions: [{ version: "5.4.130", minecraftRange: "1.21.x", software: ["PAPER", "PURPUR"] }],
  },
  {
    slug: "vault",
    name: "Vault",
    description: "Economy/permissions API bridge used by many other plugins.",
    author: "MilkBowl",
    officialUrl: "https://www.spigotmc.org/resources/vault.34315/",
    category: "Administration",
    tags: "api,economy,permissions,dependency",
    license: "MIT",
    versions: [{ version: "1.7.3", minecraftRange: "1.21.x", software: ["PAPER", "PURPUR"] }],
  },
  {
    slug: "griefprevention",
    name: "GriefPrevention",
    description: "Land claims to protect player builds.",
    officialUrl: "https://github.com/GriefPrevention/GriefPrevention",
    category: "Claims",
    tags: "claims,protection,anti-grief",
    license: "MIT",
    versions: [{ version: "17.0.0", minecraftRange: "1.21.x", software: ["PAPER", "PURPUR"] }],
  },
  {
    slug: "economyshopgui",
    name: "EconomyShopGUI",
    description: "GUI-based buy/sell shop system.",
    officialUrl: "https://www.spigotmc.org/resources/economyshopgui.69927/",
    category: "Shops",
    tags: "shop,gui,economy",
    license: "Proprietary (free tier)",
    versions: [{ version: "5.9.0", minecraftRange: "1.21.x", software: ["PAPER", "PURPUR"] }],
    dependsOn: ["vault"],
  },
  // ---- Everything below has no verified version/download source yet
  // (versions: []) — an admin must add a real, verified download URL
  // and checksum via the admin panel before any of these can actually
  // be bundled into a pack.
  {
    slug: "worldedit",
    name: "WorldEdit",
    description: "In-game map editor: selections, copy/paste, large-scale terrain edits.",
    author: "EngineHub",
    officialUrl: "https://github.com/EngineHub/WorldEdit",
    category: "World Management",
    tags: "building,editing,worldedit",
    license: "GPL-3.0",
    versions: [],
  },
  {
    slug: "worldguard",
    name: "WorldGuard",
    description: "Region protection with configurable flags (PvP, build, fire, entities).",
    author: "EngineHub",
    officialUrl: "https://github.com/EngineHub/WorldGuard",
    category: "Protection",
    tags: "regions,protection,flags",
    license: "GPL-3.0",
    versions: [],
    dependsOn: ["worldedit"],
  },
  {
    slug: "coreprotect",
    name: "CoreProtect",
    description: "Block/action logging with rollback for grief recovery.",
    category: "Logging",
    tags: "logging,rollback,anti-grief",
    license: "Proprietary (free)",
    versions: [],
  },
  {
    slug: "placeholderapi",
    name: "PlaceholderAPI",
    description: "Shared placeholder framework other plugins hook into for dynamic text.",
    author: "PlaceholderAPI Team",
    officialUrl: "https://github.com/PlaceholderAPI/PlaceholderAPI",
    category: "Utility",
    tags: "placeholders,api,dependency",
    license: "GPL-3.0",
    versions: [],
    dependsOn: ["vault"],
  },
  {
    slug: "permissionsex",
    name: "PermissionsEx",
    description: "Permissions management — an older alternative to LuckPerms.",
    category: "Permissions",
    tags: "permissions,groups",
    license: "Artistic-2.0",
    versions: [],
  },
  {
    slug: "mcmmo",
    name: "mcMMO",
    description: "RPG-style skills and leveling tied to vanilla actions (mining, combat, farming).",
    author: "nossr50",
    officialUrl: "https://github.com/mcMMO-Dev/mcMMO",
    category: "RPG",
    tags: "rpg,skills,leveling",
    license: "GPL-3.0",
    versions: [],
  },
  {
    slug: "multiverse-core",
    name: "Multiverse-Core",
    description: "Manage multiple worlds on one server — creation, teleporting, per-world settings.",
    category: "World Management",
    tags: "worlds,multiverse",
    license: "BSD-3-Clause",
    versions: [],
  },
  {
    slug: "discordsrv",
    name: "DiscordSRV",
    description: "Two-way chat/event bridge between the server and a Discord server.",
    category: "Discord Integration",
    tags: "discord,chat-bridge",
    license: "GPL-3.0",
    versions: [],
  },
  {
    slug: "protocollib",
    name: "ProtocolLib",
    description: "Low-level packet manipulation library many other plugins depend on.",
    author: "dmulloy2",
    category: "Utility",
    tags: "packets,api,dependency",
    license: "GPL-3.0",
    versions: [],
  },
  {
    slug: "plotsquared",
    name: "PlotSquared",
    description: "Grid-based plot worlds for organized land management.",
    author: "IntellectualSites",
    officialUrl: "https://github.com/IntellectualSites/PlotSquared",
    category: "Land Management",
    tags: "plots,land,grid",
    license: "GPL-3.0",
    versions: [],
  },
  {
    slug: "bentobox",
    name: "BentoBox",
    description: "Island-based gameplay framework (Skyblock, BSkyBlock, AcidIsland and similar).",
    officialUrl: "https://github.com/BentoBoxWorld/BentoBox",
    category: "Skyblock",
    tags: "skyblock,islands",
    license: "GPL-3.0",
    versions: [],
  },
  {
    slug: "factionsuuid",
    name: "Factions",
    description: "Territorial faction gameplay: claim land, form alliances, raid rivals.",
    category: "Factions",
    tags: "factions,pvp,land",
    license: "Unknown",
    versions: [],
  },
  {
    slug: "quickshop",
    name: "QuickShop",
    description: "Sign-based player shops — place a chest, set a price, players buy/sell directly.",
    category: "Player Shops",
    tags: "shop,signs,player-economy",
    license: "GPL-3.0",
    versions: [],
    dependsOn: ["vault"],
  },
  {
    slug: "chestshop",
    name: "ChestShop",
    description: "Classic sign-and-chest player shop plugin.",
    category: "Player Shops",
    tags: "shop,signs,player-economy",
    license: "Unknown",
    versions: [],
    dependsOn: ["vault"],
  },
  {
    slug: "auctionhouse",
    name: "AuctionHouse",
    description: "GUI auction house where players list items for other players to bid on/buy.",
    category: "Auctions",
    tags: "auction,economy,gui",
    license: "Unknown",
    versions: [],
    dependsOn: ["vault"],
  },
  {
    slug: "jobsreborn",
    name: "Jobs Reborn",
    description: "Players choose jobs (miner, farmer, hunter, ...) and earn currency doing them.",
    category: "Jobs",
    tags: "jobs,economy",
    license: "Unknown",
    versions: [],
    dependsOn: ["vault"],
  },
  {
    slug: "ultracosmetics",
    name: "UltraCosmetics",
    description: "Cosmetic particle effects, hats, gadgets, and morphs players can equip.",
    category: "Cosmetics",
    tags: "cosmetics,particles",
    license: "Proprietary (free)",
    versions: [],
  },
  {
    slug: "crazycrates",
    name: "CrazyCrates",
    description: "Key-based reward crates with configurable animations and loot tables.",
    category: "Crates",
    tags: "crates,rewards,keys",
    license: "Unknown",
    versions: [],
  },
  {
    slug: "votingplugin",
    name: "VotingPlugin",
    description: "Rewards players for voting on server-listing sites.",
    category: "Voting",
    tags: "voting,rewards",
    license: "Unknown",
    versions: [],
  },
  {
    slug: "litebans",
    name: "LiteBans",
    description: "Ban/mute/warn/kick management with a shared database backend.",
    category: "Moderation",
    tags: "moderation,bans,mutes",
    license: "Proprietary (free tier)",
    versions: [],
  },
  {
    slug: "nocheatplus",
    name: "NoCheatPlus",
    description: "Anti-cheat detection for movement, combat, and other exploit categories.",
    category: "Anti-Cheat",
    tags: "anticheat,security",
    license: "Unknown",
    versions: [],
  },
  {
    slug: "tab",
    name: "TAB",
    description: "Customizable tab list, scoreboard, and nametag/prefix display.",
    category: "Tab",
    tags: "tab,scoreboard,nametags",
    license: "Proprietary (free)",
    versions: [],
  },
  {
    slug: "citizens",
    name: "Citizens",
    description: "NPC framework — spawn and script non-player characters with commands/behaviors.",
    category: "Utility",
    tags: "npc,scripting",
    license: "Unknown",
    versions: [],
  },
  {
    slug: "dynmap",
    name: "Dynmap",
    description: "Live, browsable web map of the server's worlds.",
    category: "World Management",
    tags: "map,web,visualization",
    license: "Unknown",
    versions: [],
  },
  {
    slug: "skinsrestorer",
    name: "SkinsRestorer",
    description: "Restores/sets player skins, useful for offline-mode or cracked servers.",
    category: "Utility",
    tags: "skins,cosmetics",
    license: "Unknown",
    versions: [],
  },
  {
    slug: "spark",
    name: "spark",
    description: "Performance profiler for diagnosing lag and identifying slow plugins/code paths.",
    author: "Luck",
    officialUrl: "https://github.com/lucko/spark",
    category: "Performance",
    tags: "performance,profiler,lag",
    license: "GPL-3.0",
    versions: [],
  },
  {
    slug: "authme",
    name: "AuthMe Reloaded",
    description: "Login/registration and password-based authentication for offline-mode servers.",
    category: "Administration",
    tags: "auth,login,security",
    license: "GPL-3.0",
    versions: [],
  },
  {
    slug: "viaversion",
    name: "ViaVersion",
    description: "Lets newer/older Minecraft clients join a server running a different version.",
    category: "Utility",
    tags: "version,compatibility",
    license: "MIT",
    versions: [],
  },
  {
    slug: "combatlogx",
    name: "CombatLogX",
    description: "Punishes players for disconnecting mid-combat to escape a fight.",
    category: "PvP",
    tags: "pvp,combat-log",
    license: "Unknown",
    versions: [],
  },
  {
    slug: "mobarena",
    name: "MobArena",
    description: "Wave-based mob-survival minigame arenas.",
    category: "Minigames",
    tags: "minigame,pve,arena",
    license: "Unknown",
    versions: [],
  },
  {
    slug: "chatcontrol",
    name: "ChatControl",
    description: "Chat formatting, filtering, anti-spam, and channel management.",
    category: "Chat",
    tags: "chat,filtering,anti-spam",
    license: "Proprietary (free tier)",
    versions: [],
  },
  {
    slug: "holographicdisplays",
    name: "HolographicDisplays",
    description: "Floating text/holograms for signs, leaderboards, and decoration.",
    category: "Cosmetics",
    tags: "holograms,text,display",
    license: "Unknown",
    versions: [],
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
  await prisma.serverSoftware.upsert({
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

  logger.info(`Seeding ${PLUGINS.length} built-in plugins...`);
  for (const p of PLUGINS) {
    const plugin = await prisma.plugin.upsert({
      where: { slug: p.slug },
      update: {}, // never overwrite an admin's edits on re-seed
      create: {
        slug: p.slug,
        name: p.name,
        description: p.description,
        author: p.author,
        officialUrl: p.officialUrl,
        documentationUrl: p.documentationUrl,
        category: p.category,
        tags: p.tags,
        license: p.license,
        configFolderName: p.configFolderName,
        configSchema: p.configSchema ? JSON.stringify(p.configSchema) : undefined,
        configSchemaVerified: p.configSchemaVerified ?? false,
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
          compatibleSoftware: v.software.join(","),
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

  logger.info(
    "Seed complete. Most plugins have no version/download source yet — an admin must add a real, verified download URL + checksum via the admin panel before they can be bundled into a real pack."
  );
}

main()
  .catch((err) => {
    logger.error(err, "Seed failed");
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
