export interface AiChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AiCompletionResult {
  text: string;
  providerUsed: string;
}

/**
 * Every concrete provider (Anthropic, OpenAI, Google, ...) implements this.
 * The interface is deliberately minimal — one method, plain text in/out.
 * Structured output is enforced by prompting for JSON-only and validating
 * the result against the server-plan Zod schema afterwards (spec §8/§9) —
 * the provider itself never gets special "tool" access to the filesystem
 * or shell.
 */
export interface AiProvider {
  readonly name: string;
  complete(messages: AiChatMessage[], apiKey: string): Promise<string>;
}

/** Thrown by a provider implementation when the *specific key* used is
 * rate-limited or over quota — signals the pool to rotate keys/providers,
 * not to give up. */
export class ProviderExhaustedError extends Error {
  constructor(public providerName: string, message: string) {
    super(message);
    this.name = "ProviderExhaustedError";
  }
}
