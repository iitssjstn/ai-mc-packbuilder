import path from "node:path";
import fsp from "node:fs/promises";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { validateLogoUpload } from "@/lib/imageValidation";
import { assertSafeDisplayUrl } from "@/lib/urlSafety";
import { safeResolve, assertNotSymlink } from "@/lib/pathSafety";

/**
 * Branding links (Discord, Twitch, webshop, custom links, ...) are stored
 * and rendered as text/config only — the backend never fetches them
 * (spec §22). This service is the single place that validates and writes
 * them, so nothing downstream has to re-check URL safety.
 */
export class BrandingService {
  private logosRoot = path.resolve(env.STORAGE_LOCAL_PATH, "logos");

  validateLinks(branding: {
    discordUrl?: string;
    twitchUrl?: string;
    youtubeUrl?: string;
    tiktokUrl?: string;
    instagramUrl?: string;
    websiteUrl?: string;
    webshopUrl?: string;
    customLinks?: { name: string; url: string }[];
  }) {
    const urls = [
      branding.discordUrl,
      branding.twitchUrl,
      branding.youtubeUrl,
      branding.tiktokUrl,
      branding.instagramUrl,
      branding.websiteUrl,
      branding.webshopUrl,
      ...(branding.customLinks ?? []).map((l) => l.url),
    ].filter((u): u is string => Boolean(u));

    for (const url of urls) {
      assertSafeDisplayUrl(url); // throws on javascript:, data:, file:, etc.
    }
  }

  /** Persists an uploaded logo for a pack after validating it server-side. */
  async saveLogo(packId: string, userId: string, buffer: Buffer): Promise<string> {
    const pack = await prisma.serverPack.findFirst({ where: { id: packId, userId } });
    if (!pack) throw new Error("Pack not found or not owned by this user");

    const { mimeType } = validateLogoUpload(buffer); // throws on bad type/size/dimensions

    await fsp.mkdir(this.logosRoot, { recursive: true });
    const ext = mimeType === "image/png" ? ".png" : ".jpg";
    const fileName = `${crypto.randomUUID()}${ext}`; // never trust the client's filename
    const destPath = safeResolve(this.logosRoot, fileName);
    assertNotSymlink(destPath);
    await fsp.writeFile(destPath, buffer, { mode: 0o644 });

    await prisma.branding.upsert({
      where: { packId },
      update: { logoPath: destPath },
      create: { packId, logoPath: destPath },
    });

    return destPath;
  }
}

export const brandingService = new BrandingService();
