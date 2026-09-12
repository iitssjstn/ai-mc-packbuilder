import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Resolves a secret from `<NAME>_FILE` (Docker/Compose secrets convention
 * — a file path, typically `/run/secrets/<name>`) if that variable is
 * set, otherwise falls back to the plain `<NAME>` environment variable.
 * Still useful for genuinely optional things (e.g. a bootstrap AI
 * provider key) even though the app no longer requires any secrets file
 * to exist at all.
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
 * For secrets that have no reason to ever be typed in by a human — the
 * JWT signing secret and the AI-key encryption key are exactly this kind
 * — generate one on first boot and persist it to a file inside the app's
 * data volume, so it survives container restarts/rebuilds without ever
 * needing to be set anywhere. This is the reason `docker-entrypoint.sh`
 * and this whole setup can run with zero secrets files or .env entries.
 */
export function getOrCreatePersistedSecret(name: string, dataDir: string): string {
  const explicit = readSecret(name);
  if (explicit) return explicit;

  const filePath = path.join(dataDir, `.${name.toLowerCase()}`);
  try {
    return fs.readFileSync(filePath, "utf8").trim();
  } catch {
    // Doesn't exist yet — generate, persist, and return a fresh one.
  }

  const generated = crypto.randomBytes(48).toString("hex");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(filePath, generated, { mode: 0o600 });
  return generated;
}
