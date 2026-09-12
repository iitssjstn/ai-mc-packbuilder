import { AiChatMessage, AiProvider, ProviderExhaustedError, TransientProviderError } from "../types";

export class OpenAIProvider implements AiProvider {
  readonly name = "openai";

  async complete(messages: AiChatMessage[], apiKey: string): Promise<string> {
    let res: Response;
    try {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1",
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
    } catch (err) {
      throw new TransientProviderError(this.name, `OpenAI request failed to connect: ${(err as Error).message}`);
    }

    if (res.status === 429 || res.status === 402) {
      throw new ProviderExhaustedError(this.name, `OpenAI key exhausted (HTTP ${res.status})`);
    }
    if (res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504) {
      throw new TransientProviderError(this.name, `OpenAI temporarily unavailable (HTTP ${res.status})`);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAI request failed: HTTP ${res.status} — ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("OpenAI response contained no message content");
    return text as string;
  }
}
