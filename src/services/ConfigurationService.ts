import { ServerPlan } from "@/schemas/serverPlan.schema";
import { renderEula, renderServerProperties, renderReadme, renderLicenses } from "@/templates/fileTemplates";

export interface RenderedConfig {
  fileName: string;
  content: string;
}

/**
 * The only path from "what the user/AI wants" to actual file contents.
 * Everything goes through the typed templates in fileTemplates.ts — this
 * service never string-concatenates untrusted input directly into a config
 * file (spec §17: AI configuration -> schema validation -> business
 * validation -> template engine -> generated config).
 */
export class ConfigurationService {
  buildMotd(plan: ServerPlan): string {
    const base = plan.branding.motd ?? plan.server.name;
    if (plan.branding.showDiscordInMotd && plan.branding.discordUrl) {
      return `${base} §7| §b${plan.branding.discordUrl}`.slice(0, 59);
    }
    return base.slice(0, 59);
  }

  renderServerProperties(plan: ServerPlan): RenderedConfig {
    return { fileName: "server.properties", content: renderServerProperties(plan, this.buildMotd(plan)) };
  }

  renderEula(): RenderedConfig {
    return { fileName: "eula.txt", content: renderEula() };
  }

  renderReadme(plan: ServerPlan, pluginNames: string[], resolvedSoftwareVersion: string): RenderedConfig {
    return {
      fileName: "README.txt",
      content: renderReadme(plan, pluginNames, resolvedSoftwareVersion),
    };
  }

  renderLicenses(entries: { name: string; license: string | null; officialUrl: string | null }[]): RenderedConfig {
    return { fileName: "LICENSES.txt", content: renderLicenses(entries) };
  }

  /**
   * Renders a config.yml from override key-value pairs that have
   * already been filtered against a plugin's admin-verified
   * configSchema by the caller — this method itself does no
   * verification, it only turns a flat/dotted key map into YAML.
   * Dotted keys ("sethome-multiple.default") become nested blocks.
   */
  renderConfigOverrides(overrides: Record<string, string | number | boolean>): RenderedConfig | null {
    const entries = Object.entries(overrides);
    if (entries.length === 0) return null;

    const tree: Record<string, unknown> = {};
    for (const [key, value] of entries) {
      const parts = key.split(".");
      let node = tree;
      for (let i = 0; i < parts.length - 1; i++) {
        node[parts[i]] = node[parts[i]] ?? {};
        node = node[parts[i]] as Record<string, unknown>;
      }
      node[parts[parts.length - 1]] = value;
    }

    const renderNode = (node: Record<string, unknown>, indent: number): string[] => {
      const lines: string[] = [];
      for (const [key, value] of Object.entries(node)) {
        const prefix = "  ".repeat(indent);
        if (typeof value === "object" && value !== null) {
          lines.push(`${prefix}${key}:`);
          lines.push(...renderNode(value as Record<string, unknown>, indent + 1));
        } else {
          lines.push(`${prefix}${key}: ${value}`);
        }
      }
      return lines;
    };

    return { fileName: "config.yml", content: renderNode(tree, 0).join("\n") + "\n" };
  }
}

export const configurationService = new ConfigurationService();
