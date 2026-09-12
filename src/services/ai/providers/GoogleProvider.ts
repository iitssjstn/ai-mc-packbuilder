import { AiChatMessage, AiProvider, ProviderExhaustedError, TransientProviderError } from "../types";

export class GoogleProvider implements AiProvider {
  readonly name = "google";

  async complete(messages: AiChatMessage[], apiKey: string): Promise<string> {
    const system = messages.find((m) => m.role === "system")?.content;
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents,
            systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          }),
        }
      );
    } catch (err) {
      throw new TransientProviderError(this.name, `Google request failed to connect: ${(err as Error).message}`);
    }

    if (res.status === 429) {
      throw new ProviderExhaustedError(this.name, "Google key exhausted (HTTP 429)");
    }
    if (res.status === 500 || res.status === 502 || res.status === 503 || res.status === 504) {
      throw new TransientProviderError(this.name, `Google temporarily unavailable (HTTP ${res.status})`);
    }
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Google request failed: HTTP ${res.status} — ${body.slice(0, 300)}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Google response contained no text");
    return text as string;
  }
}
