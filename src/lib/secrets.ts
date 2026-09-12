import fs from "node:fs";

/**
 * Resolves a secret from `<NAME>_FILE` (Docker/Compose secrets convention
 * — a file path, typically `/run/secrets/<name>`) if that variable is
 * set, otherwise falls back to the plain `<NAME>` environment variable.
 *
 * This exists so real secrets (AI provider keys, JWT signing secret, DB
 * password) never have to sit in a `.env` file or `docker-compose.yml`
 * environment block in plaintext — mount them as Docker secrets instead
 * and point `<NAME>_FILE` at the mounted path. Env vars are visible via
 * `docker inspect`, `/proc/<pid>/environ`, and often end up in shell
 * history or CI logs; secret files mounted at `/run/secrets/*` are not.
 */
export function readSecret(name: string): string | undefined {
  const filePath = process.env[`${name}_FILE`];
  if (!filePath) return process.env[name];

  try {
    return fs.readFileSync(filePath, "utf8").trim();
  } catch (err) {
    throw new Error(`Could not read secret file for ${name} at ${filePath}: ${(err as Error).message}`);
  }
}

/**
 * Builds DATABASE_URL either directly (DATABASE_URL or DATABASE_URL_FILE)
 * or, for finer-grained secrets, from DB_HOST/DB_PORT/DB_USER/DB_NAME
 * (plain, non-sensitive) plus DB_PASSWORD or DB_PASSWORD_FILE (the
 * actual secret) — so only the password needs to be a mounted secret
 * file, not the whole connection string.
 */
export function resolveDatabaseUrl(): string | undefined {
  const direct = readSecret("DATABASE_URL");
  if (direct) return direct;

  const password = readSecret("DB_PASSWORD");
  if (!password) return undefined;

  const user = process.env.DB_USER ?? "mcpackbuilder";
  const host = process.env.DB_HOST ?? "localhost";
  const port = process.env.DB_PORT ?? "5432";
  const name = process.env.DB_NAME ?? "mcpackbuilder";
  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
}
