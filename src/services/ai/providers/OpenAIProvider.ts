import { AiChatMessage, AiProvider, ProviderExhaustedError } from "../types";

export class OpenAIProvider implements AiProvider {
  readonly name = "openai";

  async complete(messages: AiChatMessage[], apiKey: string): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
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

    if (res.status === 429 || res.status === 402) {
      throw new ProviderExhaustedError(this.name, `OpenAI key exhausted (HTTP ${res.status})`);
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
