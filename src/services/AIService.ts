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
- When the user is ready (or you have enough info and they confirm), respond
  with ONLY a JSON object matching the server plan schema — no prose, no
  markdown fences.
- Otherwise, respond with a short, friendly plain-text question or summary.

Available plugin slugs: {{PLUGIN_SLUGS}}
Available mod slugs: {{MOD_SLUGS}}
`;

export class AIService {
  async chat(history: AiChatMessage[]): Promise<{ reply: string; plan: ServerPlan | null }> {
    const [plugins, mods] = await Promise.all([
      pluginRegistryService.listActiveSlugs(),
      modRegistryService.listActiveSlugs(),
    ]);

    const system = SYSTEM_PROMPT
      .replace("{{PLUGIN_SLUGS}}", plugins.join(", ") || "(none registered yet)")
      .replace("{{MOD_SLUGS}}", mods.join(", ") || "(none registered yet)");

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
