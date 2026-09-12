import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalEnv = { ...process.env };

const mockFindMany = vi.fn();
const mockUpsert = vi.fn();
const mockDeleteMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    systemSetting: {
      findMany: (...args: any[]) => mockFindMany(...args),
      upsert: (...args: any[]) => mockUpsert(...args),
      deleteMany: (...args: any[]) => mockDeleteMany(...args),
    },
  },
}));

beforeEach(() => {
  vi.resetModules();
  mockFindMany.mockReset();
  mockUpsert.mockReset();
  mockDeleteMany.mockReset();
  process.env = {
    ...originalEnv,
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    JWT_SECRET: "test-jwt-secret-at-least-32-characters-long",
    ENCRYPTION_KEY: "a-fake-passphrase-that-is-at-least-32-chars",
    ANTHROPIC_API_KEYS: "sk-ant-fromenv",
    AI_PROVIDER_ORDER: "anthropic,openai,google",
  };
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("AiSettingsService.getSettings", () => {
  it("falls back to env vars when nothing is stored in the database yet", async () => {
    mockFindMany.mockResolvedValue([]);
    const { aiSettingsService } = await import("./AiSettingsService");
    const settings = await aiSettingsService.getSettings();
    expect(settings.order).toEqual(["anthropic", "openai", "google"]);
    expect(settings.keys.anthropic).toEqual(["sk-ant-fromenv"]);
    expect(settings.keys.openai).toEqual([]);
  });

  it("prefers the database value over env once one is stored", async () => {
    const { encryptSecret } = await import("@/lib/encryption");
    const encrypted = encryptSecret("sk-ant-fromdb1,sk-ant-fromdb2");
    mockFindMany.mockResolvedValue([{ key: "ai_provider_keys:anthropic", value: encrypted }]);

    const { aiSettingsService } = await import("./AiSettingsService");
    const settings = await aiSettingsService.getSettings();
    expect(settings.keys.anthropic).toEqual(["sk-ant-fromdb1", "sk-ant-fromdb2"]);
  });

  it("uses a stored custom order over the env default", async () => {
    mockFindMany.mockResolvedValue([{ key: "ai_provider_order", value: "google,anthropic" }]);
    const { aiSettingsService } = await import("./AiSettingsService");
    const settings = await aiSettingsService.getSettings();
    expect(settings.order).toEqual(["google", "anthropic"]);
  });
});

describe("AiSettingsService.getMaskedSettings", () => {
  it("never exposes full key values, only a count and last 4 chars", async () => {
    mockFindMany
      .mockResolvedValueOnce([{ key: "ai_provider_keys:anthropic" }]) // dbHasProvider check
      .mockResolvedValueOnce([]); // getSettings() internal call finds nothing usable -> falls back to env

    const { aiSettingsService } = await import("./AiSettingsService");
    const masked = await aiSettingsService.getMaskedSettings();
    expect(masked.providers.anthropic.lastFour).toEqual(["menv"]); // last 4 of "sk-ant-fromenv"
    expect(masked.providers.anthropic.count).toBe(1);
    expect(JSON.stringify(masked)).not.toContain("sk-ant-fromenv");
  });
});

describe("AiSettingsService.updateProviderKeys", () => {
  it("encrypts and upserts when given real keys", async () => {
    const { aiSettingsService } = await import("./AiSettingsService");
    await aiSettingsService.updateProviderKeys("openai", "sk-openai-1, sk-openai-2");
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const call = mockUpsert.mock.calls[0][0];
    expect(call.where).toEqual({ key: "ai_provider_keys:openai" });
    expect(call.create.value).not.toContain("sk-openai-1"); // must be encrypted, not plaintext
  });

  it("deletes the row instead of storing an empty value when cleared", async () => {
    const { aiSettingsService } = await import("./AiSettingsService");
    await aiSettingsService.updateProviderKeys("openai", "");
    expect(mockDeleteMany).toHaveBeenCalledWith({ where: { key: "ai_provider_keys:openai" } });
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
