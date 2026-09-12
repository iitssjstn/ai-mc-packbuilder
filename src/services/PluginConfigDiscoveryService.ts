import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { modrinthService } from "./ModrinthService";
import { aiProviderPool } from "./ai/AIProviderPool";

/**
 * The AI's job here is strictly EXTRACTION, never invention: it only ever
 * reads real documentation text fetched from Modrinth and pulls out
 * settings that text actually mentions. If a plugin has no fetchable
 * documentation, discovery returns nothing rather than letting the model
 * guess at a plugin's config structure from its training data.
 *
 * Whatever comes out of this is stored but NOT trusted for real pack
 * generation until an admin explicitly verifies it (configSchemaVerified) —
 * an extraction step passing zod validation only proves the shape was
 * followed, not that the AI read the source correctly.
 */

const extractedKeySchema = z.object({
  key: z.string().regex(/^[a-zA-Z0-9_.\-]+$/).max(64),
  valueType: z.enum(["string", "number", "boolean"]),
  description: z.string().max(200),
});
const extractionResultSchema = z.array(extractedKeySchema).max(30);

const EXTRACTION_PROMPT = `You extract configurable settings from real Minecraft plugin documentation.

Rules:
- Only list a setting if the text below actually names a real config key
  (a literal YAML/config key the plugin reads, e.g. "starting-balance" or
  "sethome-multiple.default") — not a general feature description.
- If the text doesn't mention any concrete config keys, return an empty array.
- Never invent a key that isn't explicitly named in the text.
- Respond with ONLY a JSON array, no prose, no markdown fences. Each item:
  { "key": "...", "valueType": "string" | "number" | "boolean", "description": "..." }

Documentation text:
`;

export class PluginConfigDiscoveryService {
  async discover(pluginId: string): Promise<{ found: number; sourceAvailable: boolean }> {
    const plugin = await prisma.plugin.findUniqueOrThrow({ where: { id: pluginId } });

    const body = await modrinthService.getProjectBody(plugin.slug);
    if (!body) {
      return { found: 0, sourceAvailable: false };
    }

    // Documentation bodies can be long — cap what's sent to the model,
    // truncating rather than failing.
    const sourceText = body.slice(0, 12000);

    let extracted: z.infer<typeof extractionResultSchema> = [];
    try {
      const result = await aiProviderPool.complete([
        { role: "system", content: EXTRACTION_PROMPT + sourceText },
        { role: "user", content: "Extract the config keys now." },
      ]);
      const parsed = JSON.parse(result.text.trim().replace(/^```json\s*|```$/g, ""));
      extracted = extractionResultSchema.parse(parsed);
    } catch {
      // A parse/model failure means "found nothing usable", not an error
      // that should look like real data — leave configSchema untouched
      // rather than store something we can't trust the shape of.
      return { found: 0, sourceAvailable: true };
    }

    const properties: Record<string, { type: string; description: string }> = {};
    for (const item of extracted) {
      properties[item.key] = { type: item.valueType, description: item.description };
    }

    await prisma.plugin.update({
      where: { id: plugin.id },
      data: {
        configSchema: JSON.stringify({ properties, discoveredAt: new Date().toISOString(), sourceUrl: `https://modrinth.com/plugin/${plugin.slug}` }),
        configSchemaVerified: false, // always reset — a re-discovery needs re-approval too
      },
    });

    return { found: extracted.length, sourceAvailable: true };
  }
}

export const pluginConfigDiscoveryService = new PluginConfigDiscoveryService();
