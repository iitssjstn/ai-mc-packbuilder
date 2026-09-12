import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("readSecret / resolveDatabaseUrl", () => {
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

  it("resolveDatabaseUrl returns DATABASE_URL directly when set", async () => {
    process.env.DATABASE_URL = "postgresql://direct/url";
    const { resolveDatabaseUrl } = await import("./secrets");
    expect(resolveDatabaseUrl()).toBe("postgresql://direct/url");
  });

  it("resolveDatabaseUrl builds a URL from parts when only DB_PASSWORD is set", async () => {
    delete process.env.DATABASE_URL;
    process.env.DB_PASSWORD = "p@ss/w0rd";
    process.env.DB_HOST = "db-host";
    process.env.DB_USER = "someuser";
    process.env.DB_NAME = "somedb";
    const { resolveDatabaseUrl } = await import("./secrets");
    expect(resolveDatabaseUrl()).toBe(
      `postgresql://someuser:${encodeURIComponent("p@ss/w0rd")}@db-host:5432/somedb`
    );
  });

  it("resolveDatabaseUrl returns undefined when nothing is configured", async () => {
    delete process.env.DATABASE_URL;
    delete process.env.DB_PASSWORD;
    const { resolveDatabaseUrl } = await import("./secrets");
    expect(resolveDatabaseUrl()).toBeUndefined();
  });
});
