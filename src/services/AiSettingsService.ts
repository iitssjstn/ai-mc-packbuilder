import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/encryption";
import { env } from "@/lib/env";

export const PROVIDERS = ["anthropic", "openai", "google"] as const;
export type ProviderName = (typeof PROVIDERS)[number];

const KEY_SETTING_PREFIX = "ai_provider_keys:";
const ORDER_SETTING_KEY = "ai_provider_order";

export interface AiSettings {
  order: string[];
  keys: Record<ProviderName, string[]>;
}

export interface MaskedProviderInfo {
  count: number;
  lastFour: string[];
  source: "database" | "env";
}

function envKeysFor(provider: ProviderName): string {
  if (provider === "anthropic") return env.ANTHROPIC_API_KEYS ?? "";
  if (provider === "openai") return env.OPENAI_API_KEYS ?? "";
  return env.GOOGLE_API_KEYS ?? "";
}

function splitKeys(raw: string): string[] {
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

/**
 * AI provider keys can live in two places: the database (encrypted,
 * editable via the admin UI — takes priority once set) or environment
 * variables / Docker secrets (the bootstrap/fallback for a fresh install
 * that hasn't touched the admin UI yet). This service is the only place
 * that decides which one wins.
 */
export class AiSettingsService {
  async getSettings(): Promise<AiSettings> {
    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: [ORDER_SETTING_KEY, ...PROVIDERS.map((p) => KEY_SETTING_PREFIX + p)] } },
    });
    const rowMap = new Map<string, string>(rows.map((r: { key: string; value: string }) => [r.key, r.value]));

    const order = rowMap.get(ORDER_SETTING_KEY)?.split(",").filter(Boolean) ?? splitKeys(env.AI_PROVIDER_ORDER);

    const keys = {} as Record<ProviderName, string[]>;
    for (const provider of PROVIDERS) {
      const encrypted = rowMap.get(KEY_SETTING_PREFIX + provider);
      keys[provider] = encrypted ? splitKeys(decryptSecret(encrypted)) : splitKeys(envKeysFor(provider));
    }

    return { order, keys };
  }

  /** Masked view for the admin UI — never returns full key values, only a
   * count and the last 4 characters of each key (enough to tell keys
   * apart without being able to reconstruct one). */
  async getMaskedSettings(): Promise<{ order: string[]; providers: Record<ProviderName, MaskedProviderInfo> }> {
    const rows = await prisma.systemSetting.findMany({
      where: { key: { in: PROVIDERS.map((p) => KEY_SETTING_PREFIX + p) } },
    });
    const dbHasProvider = new Set(rows.map((r: { key: string }) => r.key));

    const { order, keys } = await this.getSettings();
    const providers = {} as Record<ProviderName, MaskedProviderInfo>;
    for (const provider of PROVIDERS) {
      providers[provider] = {
        count: keys[provider].length,
        lastFour: keys[provider].map((k) => k.slice(-4)),
        source: dbHasProvider.has(KEY_SETTING_PREFIX + provider) ? "database" : "env",
      };
    }
    return { order, providers };
  }

  /** Replaces a provider's key list. Pass an empty string to clear the
   * database override and fall back to env/secrets again. */
  async updateProviderKeys(provider: ProviderName, rawCommaSeparatedKeys: string): Promise<void> {
    const cleaned = splitKeys(rawCommaSeparatedKeys).join(",");
    if (!cleaned) {
      await prisma.systemSetting.deleteMany({ where: { key: KEY_SETTING_PREFIX + provider } });
      return;
    }
    const encrypted = encryptSecret(cleaned);
    await prisma.systemSetting.upsert({
      where: { key: KEY_SETTING_PREFIX + provider },
      update: { value: encrypted },
      create: { key: KEY_SETTING_PREFIX + provider, value: encrypted },
    });
  }

  async updateOrder(order: ProviderName[]): Promise<void> {
    await prisma.systemSetting.upsert({
      where: { key: ORDER_SETTING_KEY },
      update: { value: order.join(",") },
      create: { key: ORDER_SETTING_KEY, value: order.join(",") },
    });
  }
}

export const aiSettingsService = new AiSettingsService();
