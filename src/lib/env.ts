import { z } from "zod";
import { readSecret, resolveDatabaseUrl } from "./secrets";

// Secrets (JWT_SECRET, AI provider keys, DB password) can come either from
// a plain env var or from a Docker secret file via `<NAME>_FILE` — see
// secrets.ts. Everything else here is ordinary, non-sensitive config.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (directly, via DATABASE_URL_FILE, or via DB_PASSWORD/DB_PASSWORD_FILE + DB_HOST/DB_USER/DB_NAME)"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  STORAGE_LOCAL_PATH: z.string().default("/app/data"),

  // AI provider pool (comma-separated key lists per provider — see AIProviderPool)
  OPENAI_API_KEYS: z.string().optional(),
  ANTHROPIC_API_KEYS: z.string().optional(),
  GOOGLE_API_KEYS: z.string().optional(),
  AI_PROVIDER_ORDER: z.string().default("anthropic,openai,google"),

  MAX_PACKS_PER_USER: z.coerce.number().default(20),
  MAX_ZIP_SIZE_MB: z.coerce.number().default(500),
  AI_MAX_REQUESTS_PER_MINUTE: z.coerce.number().default(20),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  // Resolve secret-capable fields through readSecret()/resolveDatabaseUrl()
  // first, then validate the merged result. Never log the resolved values
  // — only which field names failed validation.
  const resolved = {
    ...process.env,
    DATABASE_URL: resolveDatabaseUrl(),
    JWT_SECRET: readSecret("JWT_SECRET"),
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
