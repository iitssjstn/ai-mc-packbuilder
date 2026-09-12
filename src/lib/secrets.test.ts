import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("readSecret", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "secrets-test-"));
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("falls back to the plain env var when no _FILE variant is set", async () => {
    process.env.SOME_SECRET = "plain-value";
    const { readSecret } = await import("./secrets");
    expect(readSecret("SOME_SECRET")).toBe("plain-value");
  });

  it("reads from the file when <NAME>_FILE is set, trimming whitespace", async () => {
    const filePath = path.join(tmpDir, "secret.txt");
    fs.writeFileSync(filePath, "file-value\n");
    process.env.SOME_SECRET_FILE = filePath;
    delete process.env.SOME_SECRET;
    const { readSecret } = await import("./secrets");
    expect(readSecret("SOME_SECRET")).toBe("file-value");
  });

  it("prefers the file over a plain env var when both are set", async () => {
    const filePath = path.join(tmpDir, "secret2.txt");
    fs.writeFileSync(filePath, "from-file");
    process.env.SOME_SECRET_FILE = filePath;
    process.env.SOME_SECRET = "from-env";
    const { readSecret } = await import("./secrets");
    expect(readSecret("SOME_SECRET")).toBe("from-file");
  });

  it("throws a clear error when the secret file is missing", async () => {
    process.env.SOME_SECRET_FILE = path.join(tmpDir, "does-not-exist.txt");
    const { readSecret } = await import("./secrets");
    expect(() => readSecret("SOME_SECRET")).toThrow(/Could not read secret file/);
  });
});

describe("getOrCreatePersistedSecret", () => {
  const originalEnv = { ...process.env };
  let dataDir: string;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "persisted-secret-test-"));
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    fs.rmSync(dataDir, { recursive: true, force: true });
  });

  it("generates and persists a secret on first call", async () => {
    const { getOrCreatePersistedSecret } = await import("./secrets");
    const value = getOrCreatePersistedSecret("SOME_KEY", dataDir);
    expect(value.length).toBeGreaterThanOrEqual(32);
  });

  it("returns the same value on a later call (persisted to disk)", async () => {
    const { getOrCreatePersistedSecret } = await import("./secrets");
    const first = getOrCreatePersistedSecret("SOME_KEY", dataDir);
    const second = getOrCreatePersistedSecret("SOME_KEY", dataDir);
    expect(second).toBe(first);
  });

  it("prefers an explicit env var over generating one", async () => {
    process.env.SOME_KEY = "explicit-value-from-env";
    const { getOrCreatePersistedSecret } = await import("./secrets");
    expect(getOrCreatePersistedSecret("SOME_KEY", dataDir)).toBe("explicit-value-from-env");
  });

  it("different names in the same data dir get different secrets", async () => {
    const { getOrCreatePersistedSecret } = await import("./secrets");
    const a = getOrCreatePersistedSecret("KEY_A", dataDir);
    const b = getOrCreatePersistedSecret("KEY_B", dataDir);
    expect(a).not.toBe(b);
  });
});
