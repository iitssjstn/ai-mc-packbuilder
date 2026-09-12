import { z } from "zod";
import path from "node:path";
import { readSecret, getOrCreatePersistedSecret } from "./secrets";

// Secrets that a human would otherwise have to invent and store somewhere
// (JWT signing secret, AI-key encryption key) are auto-generated on first
// boot and persisted inside the data directory — see
// getOrCreatePersistedSecret. AI provider keys themselves are optional
// here too: they're normally managed via Admin -> AI-providers in the UI
// (encrypted in the database); these env vars only matter as a bootstrap
// before that first login.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  // SQLite: a file path, not a server connection — no password, no
  // separate database container, nothing to configure.
  DATABASE_URL: z.string().min(1),

  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),

  STORAGE_LOCAL_PATH: z.string(),

  OPENAI_API_KEYS: z.string().optional(),
  ANTHROPIC_API_KEYS: z.string().optional(),
  GOOGLE_API_KEYS: z.string().optional(),
  AI_PROVIDER_ORDER: z.string().default("openai,anthropic,google"),

  MAX_PACKS_PER_USER: z.coerce.number().default(20),
  MAX_ZIP_SIZE_MB: z.coerce.number().default(500),
  AI_MAX_REQUESTS_PER_MINUTE: z.coerce.number().default(20),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  // Resolved once, up front, so DATABASE_URL's default and the data
  // directory always agree — an absolute path, whether that's /app/data
  // inside the Docker image (WORKDIR /app) or <project>/data for local
  // `npm run dev` outside Docker.
  const dataDir = process.env.STORAGE_LOCAL_PATH
    ? path.resolve(process.env.STORAGE_LOCAL_PATH)
    : path.resolve(process.cwd(), "data");

  const resolved = {
    ...process.env,
    STORAGE_LOCAL_PATH: dataDir,
    DATABASE_URL: readSecret("DATABASE_URL") || process.env.DATABASE_URL || `file:${path.join(dataDir, "production.db")}`,
    JWT_SECRET: getOrCreatePersistedSecret("JWT_SECRET", dataDir),
    ANTHROPIC_API_KEYS: readSecret("ANTHROPIC_API_KEYS"),
    OPENAI_API_KEYS: readSecret("OPENAI_API_KEYS"),
    GOOGLE_API_KEYS: readSecret("GOOGLE_API_KEYS"),
  };

  const parsed = envSchema.safeParse(resolved);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid environment configuration. Problem fields: ${problems}`);
  }
  return parsed.data;
}

export const env = loadEnv();
