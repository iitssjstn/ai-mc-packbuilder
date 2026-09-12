import { describe, it, expect } from "vitest";
import { assertSafeDisplayUrl } from "./urlSafety";

describe("assertSafeDisplayUrl", () => {
  it("accepts https URLs", () => {
    expect(() => assertSafeDisplayUrl("https://discord.gg/example")).not.toThrow();
  });

  it("accepts http URLs", () => {
    expect(() => assertSafeDisplayUrl("http://example.nl/shop")).not.toThrow();
  });

  it("rejects javascript: URLs", () => {
    expect(() => assertSafeDisplayUrl("javascript:alert(1)")).toThrow(/scheme/);
  });

  it("rejects data: URLs", () => {
    expect(() => assertSafeDisplayUrl("data:text/html,<script>alert(1)</script>")).toThrow(/scheme/);
  });

  it("rejects file: URLs", () => {
    expect(() => assertSafeDisplayUrl("file:///etc/passwd")).toThrow(/scheme/);
  });

  it("rejects vbscript: URLs", () => {
    expect(() => assertSafeDisplayUrl("vbscript:msgbox(1)")).toThrow(/scheme/);
  });

  it("rejects garbage that isn't a URL at all", () => {
    expect(() => assertSafeDisplayUrl("not a url")).toThrow(/Not a valid URL/);
  });
});
