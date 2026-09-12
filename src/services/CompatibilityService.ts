import { SoftwareType } from "@prisma/client";
import { pluginRegistryService } from "./PluginRegistryService";
import { modRegistryService } from "./ModRegistryService";

export interface CompatibilityIssue {
  slug: string;
  kind: "plugin" | "mod";
  reason: string;
}

export interface CompatibilityResult {
  ok: boolean;
  issues: CompatibilityIssue[];
  /** slug -> resolved version string, for anything that passed */
  resolvedVersions: Record<string, string>;
}

const PLUGIN_SOFTWARE: SoftwareType[] = ["PAPER", "PURPUR", "VANILLA"];
const MOD_SOFTWARE: SoftwareType[] = ["FABRIC", "FORGE", "NEOFORGE"];

export class CompatibilityService {
  /**
   * Never trusts the AI's software/plugin pairing at face value — re-checks
   * against the real registry every time (spec §4, §12).
   */
  async checkPlugins(
    slugs: string[],
    minecraftVersion: string,
    software: SoftwareType
  ): Promise<CompatibilityResult> {
    const issues: CompatibilityIssue[] = [];
    const resolvedVersions: Record<string, string> = {};

    if (!PLUGIN_SOFTWARE.includes(software)) {
      for (const slug of slugs) {
        issues.push({
          slug,
          kind: "plugin",
          reason: `${software} is mod-based, not plugin-based — plugins cannot be installed on it.`,
        });
      }
      return { ok: false, issues, resolvedVersions };
    }

    for (const slug of slugs) {
      const plugin = await pluginRegistryService.getBySlug(slug);
      if (!plugin) {
        issues.push({ slug, kind: "plugin", reason: "Plugin not found in registry — AI must not invent slugs." });
        continue;
      }
      if (!plugin.isActive) {
        issues.push({ slug, kind: "plugin", reason: "Plugin is deactivated by an admin." });
        continue;
      }
      const version = await pluginRegistryService.findCompatibleVersion(slug, minecraftVersion, software);
      if (!version) {
        issues.push({
          slug,
          kind: "plugin",
          reason: `No version of ${plugin.name} is compatible with Minecraft ${minecraftVersion} on ${software}.`,
        });
        continue;
      }
      resolvedVersions[slug] = version.version;
    }

    return { ok: issues.length === 0, issues, resolvedVersions };
  }

  async checkMods(slugs: string[], minecraftVersion: string, software: SoftwareType): Promise<CompatibilityResult> {
    const issues: CompatibilityIssue[] = [];
    const resolvedVersions: Record<string, string> = {};

    if (!MOD_SOFTWARE.includes(software)) {
      for (const slug of slugs) {
        issues.push({
          slug,
          kind: "mod",
          reason: `${software} is plugin-based, not mod-based — mods cannot be installed on it.`,
        });
      }
      return { ok: false, issues, resolvedVersions };
    }

    for (const slug of slugs) {
      const mod = await modRegistryService.getBySlug(slug);
      if (!mod) {
        issues.push({ slug, kind: "mod", reason: "Mod not found in registry — AI must not invent slugs." });
        continue;
      }
      if (mod.loader !== software) {
        issues.push({ slug, kind: "mod", reason: `${mod.name} targets ${mod.loader}, not ${software}.` });
        continue;
      }
      if (!mod.isActive) {
        issues.push({ slug, kind: "mod", reason: "Mod is deactivated by an admin." });
        continue;
      }
      const version = await modRegistryService.findCompatibleVersion(slug, minecraftVersion);
      if (!version) {
        issues.push({ slug, kind: "mod", reason: `No version of ${mod.name} is compatible with Minecraft ${minecraftVersion}.` });
        continue;
      }
      resolvedVersions[slug] = version.version;
    }

    return { ok: issues.length === 0, issues, resolvedVersions };
  }
}

export const compatibilityService = new CompatibilityService();
