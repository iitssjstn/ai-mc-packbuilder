import { AiChatMessage, AiCompletionResult, AiProvider, ProviderExhaustedError, TransientProviderError } from "./types";
import { AnthropicProvider } from "./providers/AnthropicProvider";
import { OpenAIProvider } from "./providers/OpenAIProvider";
import { GoogleProvider } from "./providers/GoogleProvider";
import { aiSettingsService, ProviderName } from "@/services/AiSettingsService";

interface KeySlot {
  key: string;
  /** Timestamp until which this key is known to be exhausted; skipped until then. */
  cooldownUntil: number;
}

interface ProviderEntry {
  provider: AiProvider;
  keys: KeySlot[];
  nextKeyIndex: number;
}

const COOLDOWN_MS = 60_000; // back off a rate-limited key for a minute before retrying it
const TRANSIENT_RETRY_DELAYS_MS = [400, 1200]; // quick retries for a 5xx/network hiccup, same key

const PROVIDER_IMPLS: Record<ProviderName, AiProvider> = {
  anthropic: new AnthropicProvider(),
  openai: new OpenAIProvider(),
  google: new GoogleProvider(),
};

/**
 * Mirrors the approach used in Relay (relay.novapers.nl): a pool of
 * providers, each with a pool of API keys, tried in order. When a request
 * hits a provider/key's rate limit or quota, the pool rotates to the next
 * key, then the next provider — so a single customer-facing feature never
 * goes down just because one key is maxed out.
 *
 * Keys/order are read from AiSettingsService (database, admin-editable —
 * falls back to env/Docker-secrets for a fresh install) before every
 * `complete()` call, so updating keys via the admin UI takes effect
 * immediately, no restart needed. Cooldown state for keys that haven't
 * changed is preserved across calls since this pool is a module-level
 * singleton for the process lifetime.
 *
 * This never exposes which key was used to the caller, and it never lets
 * the AI response itself dictate provider/model choice — that stays a
 * server-side operational concern.
 */
export class AIProviderPool {
  private entries: Map<ProviderName, ProviderEntry> = new Map();

  /** Re-reads current settings and merges them into the in-memory state,
   * preserving cooldowns for keys that are unchanged. */
  private async sync(): Promise<{ order: string[] }> {
    const { order, keys } = await aiSettingsService.getSettings();

    for (const provider of Object.keys(PROVIDER_IMPLS) as ProviderName[]) {
      const keyList = keys[provider] ?? [];
      let entry = this.entries.get(provider);
      if (!entry) {
        entry = { provider: PROVIDER_IMPLS[provider], keys: [], nextKeyIndex: 0 };
        this.entries.set(provider, entry);
      }
      const existingByKey = new Map(entry.keys.map((k) => [k.key, k]));
      entry.keys = keyList.map((key) => existingByKey.get(key) ?? { key, cooldownUntil: 0 });
      entry.nextKeyIndex = entry.nextKeyIndex % Math.max(entry.keys.length, 1);
    }

    return { order };
  }

  private pickKey(entry: ProviderEntry): KeySlot | null {
    const now = Date.now();
    for (let i = 0; i < entry.keys.length; i++) {
      const idx = (entry.nextKeyIndex + i) % entry.keys.length;
      const slot = entry.keys[idx];
      if (slot.cooldownUntil <= now) {
        entry.nextKeyIndex = (idx + 1) % entry.keys.length;
        return slot;
      }
    }
    return null; // every key for this provider is currently cooling down
  }

  async complete(messages: AiChatMessage[]): Promise<AiCompletionResult> {
    const { order } = await this.sync();
    const attempts: string[] = [];

    for (const rawName of order) {
      const name = rawName.trim() as ProviderName;
      const entry = this.entries.get(name);
      if (!entry || entry.keys.length === 0) continue; // provider not configured — skip

      // Try every non-cooling-down key for this provider before moving on.
      for (let tries = 0; tries < entry.keys.length; tries++) {
        const slot = this.pickKey(entry);
        if (!slot) break; // all keys for this provider are cooling down

        try {
          const text = await this.completeWithRetry(entry.provider, messages, slot.key);
          return { text, providerUsed: entry.provider.name };
        } catch (err) {
          if (err instanceof ProviderExhaustedError) {
            slot.cooldownUntil = Date.now() + COOLDOWN_MS;
            attempts.push(`${entry.provider.name}(key exhausted)`);
            continue; // try the next key on this same provider
          }
          attempts.push(`${entry.provider.name}(error: ${(err as Error).message})`);
          break; // non-quota error — move to the next provider, not the next key
        }
      }
    }

    throw new Error(
      `All configured AI providers/keys failed or are exhausted. Attempts: ${attempts.join(", ") || "none configured"}`
    );
  }

  /** A 5xx/overload/network hiccup is usually gone within a second or
   * two — worth a couple of quick retries on the same key before
   * treating it as a real failure and moving on to the next key/provider. */
  private async completeWithRetry(provider: AiProvider, messages: AiChatMessage[], key: string): Promise<string> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await provider.complete(messages, key);
      } catch (err) {
        if (!(err instanceof TransientProviderError) || attempt >= TRANSIENT_RETRY_DELAYS_MS.length) throw err;
        await new Promise((resolve) => setTimeout(resolve, TRANSIENT_RETRY_DELAYS_MS[attempt]));
      }
    }
  }
}

export const aiProviderPool = new AIProviderPool();
