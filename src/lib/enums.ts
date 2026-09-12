/**
 * SQLite has no native enum type, so these are stored as plain `String`
 * columns in the database (see prisma/schema.prisma) and validated at the
 * application boundary instead (Zod schemas on API routes, and these TS
 * union types everywhere else). This is the same practical safety as a DB
 * enum for an app at this scale — the only thing you lose is the database
 * itself rejecting an invalid value if something bypassed the app layer
 * entirely (e.g. a manual SQL edit), which isn't a realistic concern here.
 */
export const SOFTWARE_TYPES = ["VANILLA", "PAPER", "PURPUR", "FABRIC", "FORGE", "NEOFORGE"] as const;
export type SoftwareType = (typeof SOFTWARE_TYPES)[number];

export const SOFTWARE_KINDS = ["PLUGIN_BASED", "MOD_BASED"] as const;
export type SoftwareKind = (typeof SOFTWARE_KINDS)[number];

export const ROLES = ["USER", "ADMIN", "OWNER"] as const;
export type Role = (typeof ROLES)[number];

export const MESSAGE_ROLES = ["USER", "ASSISTANT", "SYSTEM"] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export const PACK_STATUSES = ["DRAFT", "PLANNED", "GENERATING", "READY", "FAILED"] as const;
export type PackStatus = (typeof PACK_STATUSES)[number];

export const PLUGIN_CATEGORIES = [
  "Administration",
  "Economy",
  "Permissions",
  "Protection",
  "Claims",
  "Anti-Cheat",
  "Moderation",
  "Chat",
  "Gameplay",
  "Quests",
  "World Management",
  "World Generation",
  "Teleportation",
  "Cosmetics",
  "Ranks",
  "Shops",
  "Crates",
  "Jobs",
  "Skills",
  "Minigames",
  "Discord",
  "Logging",
  "Performance",
  "Security",
  "Utility",
] as const;
export type PluginCategory = (typeof PLUGIN_CATEGORIES)[number];

export const NOTIFICATION_TYPES = ["pack_ready", "pack_failed", "password_changed"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const HEALTH_STATUSES = ["healthy", "warning", "error"] as const;
export type HealthStatus = (typeof HEALTH_STATUSES)[number];
