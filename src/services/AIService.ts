import { aiProviderPool } from "./ai/AIProviderPool";
import { AiChatMessage } from "./ai/types";
import { parseServerPlan, serverPlanSchema, ServerPlan } from "@/schemas/serverPlan.schema";
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

The server plan JSON MUST use exactly this shape and these field names —
nesting, casing, and every field matters. Example (adapt the actual values,
never the structure):
{
  "minecraft": { "version": "1.21.1", "edition": "java" },
  "software": { "type": "purpur" },
  "server": {
    "name": "My Awesome SMP",
    "maxPlayers": 30,
    "gamemode": "survival",
    "difficulty": "normal",
    "pvp": true,
    "spawnProtection": 16,
    "viewDistance": 10,
    "simulationDistance": 10
  },
  "serverType": "smp",
  "requestedPluginSlugs": ["essentialsx", "vault", "luckperms", "griefprevention"],
  "requestedModSlugs": [],
  "configOverrides": {},
  "branding": {}
}
- "software.type" is one of: vanilla, paper, purpur, fabric, forge, neoforge
- "server.gamemode" is one of: survival, creative, adventure
- "server.difficulty" is one of: peaceful, easy, normal, hard
- "serverType" is one of: survival, smp, pvp, minigames, skyblock, creative, prison, factions, custom
- Plugins/mods go in requestedPluginSlugs / requestedModSlugs — never under "server", never a plain "plugins" key
- Do not invent top-level fields (e.g. no "playerCount", no "ram") — player
  count is server.maxPlayers; there is no RAM field in this schema at all
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

    const plan = this.tryParsePlan(text);
    if (plan) return { reply: "Ik heb een serverplan opgesteld op basis van je wensen.", plan };

    // The model may have intended this as a plan but gotten the shape
    // wrong (wrong field names/nesting, missing required fields) — that
    // used to just show the broken JSON to the user as if it were a
    // normal reply, with the AI never told anything was wrong. One
    // corrective retry, telling it exactly what zod rejected, before
    // falling back to showing the text as-is.
    if (this.looksLikeAttemptedPlan(text)) {
      const validationError = this.describeValidationError(text);
      const retryMessages: AiChatMessage[] = [
        ...messages,
        { role: "assistant", content: text },
        {
          role: "user",
          content: `That JSON doesn't match the required server plan schema: ${validationError}. Re-read the exact shape and field names in your instructions and respond with ONLY the corrected JSON object.`,
        },
      ];
      const retry = await aiProviderPool.complete(retryMessages);
      const retriedPlan = this.tryParsePlan(retry.text);
      if (retriedPlan) return { reply: "Ik heb een serverplan opgesteld op basis van je wensen.", plan: retriedPlan };
    }

    return { reply: text, plan: null };
  }

  private tryParsePlan(text: string): ServerPlan | null {
    try {
      return parseServerPlan(text);
    } catch {
      return null;
    }
  }

  /** A cheap heuristic — full JSON parsing/validation happens in
   * parseServerPlan; this just decides whether a retry is worth
   * attempting at all, versus text that was never meant to be a plan. */
  private looksLikeAttemptedPlan(text: string): boolean {
    const trimmed = text.trim();
    return trimmed.startsWith("{") && trimmed.includes("minecraft");
  }

  private describeValidationError(text: string): string {
    try {
      const cleaned = text.trim().replace(/^```json\s*|\s*```$/g, "");
      const json = JSON.parse(cleaned);
      const result = serverPlanSchema.safeParse(json);
      if (!result.success) {
        return result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      }
      return "unknown validation error";
    } catch {
      return "the response was not valid JSON at all";
    }
  }
}

export const aiService = new AIService();
