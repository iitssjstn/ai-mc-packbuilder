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
   * Applies simple, whitelisted config overrides the user asked for in
   * plain language (e.g. "normal players get 3 homes, VIP gets 10") onto a
   * specific plugin's YAML config. Only known keys per plugin are ever
   * touched — arbitrary override keys are dropped, not written through.
   */
  applyHomesOverride(overrides: ServerPlan["configOverrides"]): { defaultHomes: number; vipHomes: number } {
    const homes = (overrides.homes as any) ?? {};
    const defaultHomes = Number.isFinite(homes.default) ? Math.max(0, Math.min(50, homes.default)) : 3;
    const vipHomes = Number.isFinite(homes.vip) ? Math.max(0, Math.min(50, homes.vip)) : 10;
    return { defaultHomes, vipHomes };
  }
}

export const configurationService = new ConfigurationService();
