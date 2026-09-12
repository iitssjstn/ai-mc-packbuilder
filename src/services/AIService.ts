import { aiProviderPool } from "./ai/AIProviderPool";
import { AiChatMessage } from "./ai/types";
import { parseServerPlan, ServerPlan } from "@/schemas/serverPlan.schema";
import { pluginRegistryService } from "./PluginRegistryService";
import { modRegistryService } from "./ModRegistryService";

const SYSTEM_PROMPT = `You are the AI Server Builder for a Minecraft Java Edition server-pack generator.

Rules you must always follow:
- Minecraft JAVA EDITION ONLY. Never suggest Bedrock.
- You never write files, run shell commands, or execute anything. You only ever
  produce a JSON server plan, or a short clarifying question in plain text.
- Ask for missing critical info (Minecraft version, server software, purpose,
  player count) rather than silently guessing.
- Only reference plugins/mods by slug from the provided registry list below —
  never invent one that isn't in the list.
- Prefer fewer plugins: if one plugin already covers a requested feature,
  don't add another for the same feature.
- If the user asks for a setting a plugin actually controls — not just which
  plugins to include — put it in configOverrides[pluginSlug][key] so it
  actually ends up in the generated config file, not just the README.
  Only use a (plugin, key) pair listed below under "Known configurable
  settings" — those are the only ones an admin has verified are real and
  will actually be written. If a plugin isn't listed there at all, or the
  exact setting isn't listed for it, don't guess a key name — just mention
  in your reply that it can't be automatically configured yet.
  Leave a key out entirely if the user didn't ask for it — the plugin's own
  default applies either way, and an omitted key is not the same as a wrong one.
- When the user is ready (or you have enough info and they confirm), respond
  with ONLY a JSON object matching the server plan schema — no prose, no
  markdown fences.
- Otherwise, respond with a short, friendly plain-text question or summary.
- If the user asks you to "make it", "generate it", "give me the files", or
  similar once a plan has already been discussed: if anything is still
  missing or unconfirmed, ask for it now. Otherwise, respond with the JSON
  plan as instructed above — that JSON is what makes the "Create Server
  Pack" button in the UI actually work, so producing it now IS how you get
  them their files. Never respond with just an explanation of how the
  system works instead of actually outputting the plan when they've asked
  for the result — that leaves them with a good explanation and no pack.

Available plugin slugs: {{PLUGIN_SLUGS}}
Available mod slugs: {{MOD_SLUGS}}

Known configurable settings (verified — safe to use in configOverrides):
{{CONFIG_KEYS}}
`;

export class AIService {
  async chat(history: AiChatMessage[]): Promise<{ reply: string; plan: ServerPlan | null }> {
    const [plugins, mods, configurablePlugins] = await Promise.all([
      pluginRegistryService.listActiveSlugs(),
      modRegistryService.listActiveSlugs(),
      pluginRegistryService.listVerifiedConfigSchemas(),
    ]);

    const configKeysText = configurablePlugins.length
      ? configurablePlugins
          .map(
            (p) =>
              `- ${p.slug}: ` +
              Object.entries(p.properties)
                .map(([key, meta]) => `${key} (${(meta as { type: string }).type})`)
                .join(", ")
          )
          .join("\n")
      : "(none verified yet)";

    const system = SYSTEM_PROMPT
      .replace("{{PLUGIN_SLUGS}}", plugins.join(", ") || "(none registered yet)")
      .replace("{{MOD_SLUGS}}", mods.join(", ") || "(none registered yet)")
      .replace("{{CONFIG_KEYS}}", configKeysText);

    const messages: AiChatMessage[] = [{ role: "system", content: system }, ...history];

    const { text } = await aiProviderPool.complete(messages);

    // Try to interpret the reply as a finished plan; if that fails, it's
    // just conversational text to show the user as-is.
    try {
      const plan = parseServerPlan(text);
      return { reply: "Ik heb een serverplan opgesteld op basis van je wensen.", plan };
    } catch {
      return { reply: text, plan: null };
    }
  }
}

export const aiService = new AIService();
