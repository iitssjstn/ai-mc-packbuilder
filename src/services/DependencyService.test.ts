import { describe, it, expect, vi, beforeEach } from "vitest";

// Build a tiny fake plugin graph:
//   economyshopgui --(required)--> vault
//   vault --(optional)--> luckperms
//   a --(required)--> b, b --(required)--> a   (cycle, must not hang)
const FAKE_PLUGINS: Record<string, any> = {
  economyshopgui: {
    slug: "economyshopgui",
    dependsOn: [{ optional: false, dependsOn: { slug: "vault" } }],
  },
  vault: {
    slug: "vault",
    dependsOn: [{ optional: true, dependsOn: { slug: "luckperms" } }],
  },
  luckperms: { slug: "luckperms", dependsOn: [] },
  a: { slug: "a", dependsOn: [{ optional: false, dependsOn: { slug: "b" } }] },
  b: { slug: "b", dependsOn: [{ optional: false, dependsOn: { slug: "a" } }] },
};

vi.mock("./PluginRegistryService", () => ({
  pluginRegistryService: {
    getBySlug: vi.fn((slug: string) => Promise.resolve(FAKE_PLUGINS[slug] ?? null)),
  },
}));
vi.mock("./ModRegistryService", () => ({
  modRegistryService: { getBySlug: vi.fn(() => Promise.resolve(null)) },
}));

const { dependencyService } = await import("./DependencyService");

describe("DependencyService.resolvePlugins", () => {
  it("auto-adds a required dependency", async () => {
    const result = await dependencyService.resolvePlugins(["economyshopgui"]);
    expect(result.resolvedSlugs).toContain("vault");
    expect(result.autoAdded).toEqual([{ slug: "vault", requiredBy: "economyshopgui" }]);
  });

  it("does not auto-add an optional dependency, but reports it", async () => {
    const result = await dependencyService.resolvePlugins(["economyshopgui"]);
    expect(result.resolvedSlugs).not.toContain("luckperms");
    expect(result.optionalSkipped).toEqual([{ slug: "luckperms", requiredBy: "vault" }]);
  });

  it("does not re-add a dependency the user already requested", async () => {
    const result = await dependencyService.resolvePlugins(["economyshopgui", "vault"]);
    expect(result.autoAdded).toEqual([]);
  });

  it("terminates on a circular dependency instead of hanging", async () => {
    const result = await dependencyService.resolvePlugins(["a"]);
    expect(result.resolvedSlugs.sort()).toEqual(["a", "b"]);
  });
});
