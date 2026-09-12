import { AiChatMessage, AiProvider, ProviderExhaustedError, TransientProviderError } from "../types";

export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";

  async complete(messages: AiChatMessage[], apiKey: string): Promise<string> {
    const system = messages.find((m) => m.role === "system")?.content;
    const conversation = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    let res: Response;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          system,
          messages: conversation,
        }),
      });
    } catch (err) {
      // Network-level failure (timeout, DNS, connection reset) — not this
      // key's fault, worth a quick retry rather than an immediate failure.
      throw new TransientProviderError(this.name, `Anthropic request failed to connect: ${(err as Error).message}`);
    }

    if (res.status === 429 || res.status === 402) {
      throw new ProviderExhaustedError(this.name, `Anthropic key exhausted (HTTP ${res.status})`);
    }
    // 500/502/503/504/529 ("overloaded") are transient service hiccups,
    // not a problem with this key — retry the same key briefly instead
    // of immediately giving up on the whole request.
    if (res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504 || res.status === 529) {
      throw new TransientProviderError(this.name, `Anthropic temporarily unavailable (HTTP ${res.status})`);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Anthropic request failed: HTTP ${res.status} — ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    const textBlock = data.content?.find((c: any) => c.type === "text");
    if (!textBlock) throw new Error("Anthropic response contained no text block");
    return textBlock.text as string;
  }
}
