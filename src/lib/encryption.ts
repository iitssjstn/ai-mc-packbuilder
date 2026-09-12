import crypto from "node:crypto";
import { getOrCreatePersistedSecret } from "./secrets";

const DATA_DIR = process.env.STORAGE_LOCAL_PATH || "/app/data";

/**
 * AES-256-GCM encryption for secrets stored in the database (currently:
 * AI provider keys, editable via the admin UI). The key is auto-generated
 * on first use and persisted inside the data volume (see
 * getOrCreatePersistedSecret) — nothing to set up manually. If the data
 * volume is ever lost, a new key gets generated and any previously
 * encrypted AI-provider keys in the database become unreadable; just
 * re-enter them via Admin -> AI-providers.
 */
function getKey(): Buffer {
  const passphrase = getOrCreatePersistedSecret("ENCRYPTION_KEY", DATA_DIR);
  return crypto.createHash("sha256").update(passphrase).digest();
}

/** Returns `iv:authTag:ciphertext`, all base64 — safe to store as a single
 * string column value. */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12); // recommended IV size for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString("base64")).join(":");
}

export function decryptSecret(stored: string): string {
  const [ivB64, tagB64, dataB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted value (expected iv:authTag:ciphertext)");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}
