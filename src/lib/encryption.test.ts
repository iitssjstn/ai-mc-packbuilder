import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("encryptSecret / decryptSecret", () => {
  const originalEnv = { ...process.env };
  let tmpDir: string;

  beforeEach(() => {
    vi.resetModules();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "encryption-test-"));
    process.env = { ...originalEnv, STORAGE_LOCAL_PATH: tmpDir };
    delete process.env.ENCRYPTION_KEY;
    delete process.env.ENCRYPTION_KEY_FILE;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("round-trips a plaintext value with an auto-generated key", async () => {
    const { encryptSecret, decryptSecret } = await import("./encryption");
    const encrypted = encryptSecret("sk-ant-super-secret-key");
    expect(encrypted).not.toContain("sk-ant-super-secret-key");
    expect(decryptSecret(encrypted)).toBe("sk-ant-super-secret-key");
  });

  it("persists the generated key across separate calls in the same data dir", async () => {
    const { encryptSecret: encrypt1 } = await import("./encryption");
    const encrypted = encrypt1("value");

    vi.resetModules();
    const { decryptSecret: decrypt2 } = await import("./encryption");
    expect(decrypt2(encrypted)).toBe("value");
  });

  it("produces a different ciphertext each time (random IV)", async () => {
    const { encryptSecret } = await import("./encryption");
    const a = encryptSecret("same-plaintext");
    const b = encryptSecret("same-plaintext");
    expect(a).not.toBe(b);
  });

  it("uses an explicit ENCRYPTION_KEY over the auto-generated one when set", async () => {
    process.env.ENCRYPTION_KEY = "a-fake-passphrase-that-is-at-least-32-chars";
    const { encryptSecret, decryptSecret } = await import("./encryption");
    const encrypted = encryptSecret("value");
    expect(decryptSecret(encrypted)).toBe("value");
  });

  it("different data directories get independently generated keys", async () => {
    const { encryptSecret: encryptInDirA } = await import("./encryption");
    const encrypted = encryptInDirA("value");

    const otherDir = fs.mkdtempSync(path.join(os.tmpdir(), "encryption-test-other-"));
    process.env.STORAGE_LOCAL_PATH = otherDir;
    vi.resetModules();
    const { decryptSecret: decryptInDirB } = await import("./encryption");
    expect(() => decryptInDirB(encrypted)).toThrow();
    fs.rmSync(otherDir, { recursive: true, force: true });
  });

  it("rejects a malformed stored value", async () => {
    const { decryptSecret } = await import("./encryption");
    expect(() => decryptSecret("not-a-valid-format")).toThrow(/Malformed/);
  });
});
