import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("encryptSecret / decryptSecret", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, ENCRYPTION_KEY: "a-fake-passphrase-that-is-at-least-32-chars" };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("round-trips a plaintext value", async () => {
    const { encryptSecret, decryptSecret } = await import("./encryption");
    const encrypted = encryptSecret("sk-ant-super-secret-key");
    expect(encrypted).not.toContain("sk-ant-super-secret-key");
    expect(decryptSecret(encrypted)).toBe("sk-ant-super-secret-key");
  });

  it("produces a different ciphertext each time (random IV)", async () => {
    const { encryptSecret } = await import("./encryption");
    const a = encryptSecret("same-plaintext");
    const b = encryptSecret("same-plaintext");
    expect(a).not.toBe(b);
  });

  it("throws when ENCRYPTION_KEY is missing", async () => {
    delete process.env.ENCRYPTION_KEY;
    const { encryptSecret } = await import("./encryption");
    expect(() => encryptSecret("value")).toThrow(/ENCRYPTION_KEY/);
  });

  it("throws when ENCRYPTION_KEY is too short", async () => {
    process.env.ENCRYPTION_KEY = "too-short";
    const { encryptSecret } = await import("./encryption");
    expect(() => encryptSecret("value")).toThrow(/ENCRYPTION_KEY/);
  });

  it("rejects a malformed stored value", async () => {
    const { decryptSecret } = await import("./encryption");
    expect(() => decryptSecret("not-a-valid-format")).toThrow(/Malformed/);
  });

  it("fails to decrypt with the wrong key (auth tag mismatch)", async () => {
    const { encryptSecret } = await import("./encryption");
    const encrypted = encryptSecret("value");
    process.env.ENCRYPTION_KEY = "a-different-passphrase-that-is-also-32-chars";
    const { decryptSecret } = await import("./encryption");
    expect(() => decryptSecret(encrypted)).toThrow();
  });
});
