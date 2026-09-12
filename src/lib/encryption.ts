import crypto from "node:crypto";
import { readSecret } from "./secrets";

/**
 * AES-256-GCM encryption for secrets stored in the database (currently:
 * AI provider keys, editable via the admin UI). The encryption key itself
 * is the one remaining bootstrap secret that has to live outside the
 * database — via ENCRYPTION_KEY_FILE (Docker secret) or, for local dev,
 * the plain ENCRYPTION_KEY env var.
 *
 * The passphrase is hashed to a 32-byte key with SHA-256 rather than used
 * directly — it only needs to be a high-entropy string (same bar as
 * JWT_SECRET), not a raw hex-encoded key.
 */
function getKey(): Buffer {
  const passphrase = readSecret("ENCRYPTION_KEY");
  if (!passphrase || passphrase.length < 32) {
    throw new Error(
      "ENCRYPTION_KEY (or ENCRYPTION_KEY_FILE) must be set and at least 32 characters long — " +
        "required to store AI provider keys in the database. See secrets/encryption_key.txt.example."
    );
  }
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
