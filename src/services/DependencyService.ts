import { pluginRegistryService } from "./PluginRegistryService";
import { modRegistryService } from "./ModRegistryService";

export interface DependencyResolution {
  /** Final slug list, including auto-added required dependencies. */
  resolvedSlugs: string[];
  /** Slugs that were added automatically and why, so the UI can tell the user. */
  autoAdded: { slug: string; requiredBy: string }[];
  /** Optional dependencies that were NOT auto-added — surfaced as suggestions. */
  optionalSkipped: { slug: string; requiredBy: string }[];
}

/**
 * Walks the dependency graph for the requested plugins/mods, auto-adding
 * required (non-optional) dependencies (spec §13). Detects cycles so a bad
 * registry entry can never cause infinite recursion.
 */
export class DependencyService {
  async resolvePlugins(requestedSlugs: string[]): Promise<DependencyResolution> {
    const resolved = new Set(requestedSlugs);
    const autoAdded: DependencyResolution["autoAdded"] = [];
    const optionalSkipped: DependencyResolution["optionalSkipped"] = [];
    const visiting = new Set<string>();

    const visit = async (slug: string) => {
      if (visiting.has(slug)) return; // cycle guard
      visiting.add(slug);

      const plugin = await pluginRegistryService.getBySlug(slug);
      if (!plugin) return;

      for (const dep of plugin.dependsOn) {
        const depSlug = dep.dependsOn.slug;
        if (dep.optional) {
          if (!resolved.has(depSlug)) {
            optionalSkipped.push({ slug: depSlug, requiredBy: slug });
          }
          continue;
        }
        if (!resolved.has(depSlug)) {
          resolved.add(depSlug);
          autoAdded.push({ slug: depSlug, requiredBy: slug });
        }
        await visit(depSlug);
      }

      visiting.delete(slug);
    };

    for (const slug of requestedSlugs) {
      await visit(slug);
    }

    return { resolvedSlugs: Array.from(resolved), autoAdded, optionalSkipped };
  }

  async resolveMods(requestedSlugs: string[]): Promise<DependencyResolution> {
    const resolved = new Set(requestedSlugs);
    const autoAdded: DependencyResolution["autoAdded"] = [];
    const optionalSkipped: DependencyResolution["optionalSkipped"] = [];
    const visiting = new Set<string>();

    const visit = async (slug: string) => {
      if (visiting.has(slug)) return;
      visiting.add(slug);

      const mod = await modRegistryService.getBySlug(slug);
      if (!mod) return;

      for (const dep of mod.dependsOn) {
        const depSlug = dep.dependsOn.slug;
        if (dep.optional) {
          if (!resolved.has(depSlug)) optionalSkipped.push({ slug: depSlug, requiredBy: slug });
          continue;
        }
        if (!resolved.has(depSlug)) {
          resolved.add(depSlug);
          autoAdded.push({ slug: depSlug, requiredBy: slug });
        }
        await visit(depSlug);
      }

      visiting.delete(slug);
    };

    for (const slug of requestedSlugs) {
      await visit(slug);
    }

    return { resolvedSlugs: Array.from(resolved), autoAdded, optionalSkipped };
  }
}

export const dependencyService = new DependencyService();
