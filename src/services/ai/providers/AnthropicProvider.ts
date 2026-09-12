import { AiChatMessage, AiProvider, ProviderExhaustedError } from "../types";

export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic";

  async complete(messages: AiChatMessage[], apiKey: string): Promise<string> {
    const system = messages.find((m) => m.role === "system")?.content;
    const conversation = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch("https://api.anthropic.com/v1/messages", {
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

    if (res.status === 429 || res.status === 402) {
      throw new ProviderExhaustedError(this.name, `Anthropic key exhausted (HTTP ${res.status})`);
    }
    if (!res.ok) {
      throw new Error(`Anthropic request failed: HTTP ${res.status}`);
    }

    const data = await res.json();
    const textBlock = data.content?.find((c: any) => c.type === "text");
    if (!textBlock) throw new Error("Anthropic response contained no text block");
    return textBlock.text as string;
  }
}
