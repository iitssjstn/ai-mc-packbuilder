import { z } from "zod";

/**
 * The AI NEVER writes files or runs commands. It only ever produces an
 * object matching this schema. Everything downstream (compatibility,
 * dependency, conflict, config, pack generation) re-validates against the
 * actual registry — this schema only guarantees *shape*, not that the
 * referenced plugins/versions/software actually exist or are compatible.
 * See spec §8/§9.
 */

const customLinkSchema = z.object({
  name: z.string().min(1).max(64),
  url: z.string().url(),
});

const brandingSchema = z
  .object({
    serverName: z.string().min(1).max(64).optional(),
    motd: z.string().max(64).optional(),
    welcomeMessage: z.string().max(512).optional(),
    joinMessage: z.string().max(256).optional(),
    discordUrl: z.string().url().optional(),
    twitchUrl: z.string().url().optional(),
    youtubeUrl: z.string().url().optional(),
    tiktokUrl: z.string().url().optional(),
    instagramUrl: z.string().url().optional(),
    websiteUrl: z.string().url().optional(),
    webshopUrl: z.string().url().optional(),
    customLinks: z.array(customLinkSchema).max(50).default([]),
    showDiscordInMotd: z.boolean().default(false),
    generateLinksCommand: z.boolean().default(false),
  })
  .default({});

export const serverPlanSchema = z.object({
  minecraft: z.object({
    version: z.string().regex(/^\d+\.\d+(\.\d+)?$/, "Expected a version like 1.21.8"),
    edition: z.literal("java"), // Bedrock is out of scope entirely — spec §2
  }),
  software: z.object({
    type: z.enum(["vanilla", "paper", "purpur", "fabric", "forge", "neoforge"]),
  }),
  server: z.object({
    name: z.string().min(1).max(64),
    maxPlayers: z.number().int().min(1).max(1000),
    gamemode: z.enum(["survival", "creative", "adventure"]),
    difficulty: z.enum(["peaceful", "easy", "normal", "hard"]),
    pvp: z.boolean(),
    spawnProtection: z.number().int().min(0).max(64).default(16),
    viewDistance: z.number().int().min(3).max(32).default(10),
    simulationDistance: z.number().int().min(3).max(32).default(10),
  }),
  serverType: z.enum([
    "survival", "smp", "pvp", "minigames", "skyblock", "creative", "prison", "factions", "custom",
  ]),
  // Plugin/mod slugs only — the backend resolves these against the real
  // registry (§10/§11). The AI cannot invent a plugin that doesn't exist
  // there; CompatibilityService rejects anything not found.
  requestedPluginSlugs: z.array(z.string().min(1)).max(100).default([]),
  requestedModSlugs: z.array(z.string().min(1)).max(100).default([]),
  configOverrides: z.record(z.string(), z.unknown()).default({}),
  branding: brandingSchema,
});

export type ServerPlan = z.infer<typeof serverPlanSchema>;

/** What the AI is actually prompted to return. Parsing failures are always
 * treated as "ask the AI to correct itself" or "ask the user", never as an
 * excuse to fall back to executing something unvalidated. */
export function parseServerPlan(raw: string): ServerPlan {
  const cleaned = raw.trim().replace(/^```json\s*|\s*```$/g, "");
  let json: unknown;
  try {
    json = JSON.parse(cleaned);
  } catch {
    throw new Error("AI output was not valid JSON");
  }
  return serverPlanSchema.parse(json);
}
