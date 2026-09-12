import { describe, it, expect } from "vitest";
import { safeResolve, assertSafeFilename } from "./pathSafety";

describe("safeResolve", () => {
  const base = "/tmp/packbuilder-test-base";

  it("resolves a normal relative path inside the base dir", () => {
    expect(safeResolve(base, "plugins/EssentialsX.jar")).toBe(`${base}/plugins/EssentialsX.jar`);
  });

  it("rejects path traversal", () => {
    expect(() => safeResolve(base, "../../etc/passwd")).toThrow(/traversal/);
  });

  it("rejects absolute paths", () => {
    expect(() => safeResolve(base, "/etc/passwd")).toThrow(/Absolute/);
  });

  it("rejects null bytes", () => {
    expect(() => safeResolve(base, "plugins/evil.jar\0.txt")).toThrow(/null byte/);
  });

  it("rejects an escape disguised with backslashes", () => {
    expect(() => safeResolve(base, "..\\..\\etc\\passwd")).toThrow(/traversal/);
  });
});

describe("assertSafeFilename", () => {
  it("accepts a normal filename", () => {
    expect(() => assertSafeFilename("server.properties")).not.toThrow();
  });

  it("rejects disallowed characters", () => {
    expect(() => assertSafeFilename("evil;rm -rf.txt")).toThrow();
  });

  it("enforces an extension allowlist when given one", () => {
    expect(() => assertSafeFilename("payload.exe", [".txt", ".properties"])).toThrow();
  });
});
