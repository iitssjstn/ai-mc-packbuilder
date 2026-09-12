import fs from "node:fs";
import fsp from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { assertSafeDownloadUrl } from "@/lib/urlSafety";
import { assertSafeFilename, safeResolve, assertNotSymlink } from "@/lib/pathSafety";
import { logger } from "@/lib/logger";

export interface DownloadTarget {
  name: string; // display name, used for the .jar filename
  downloadUrl: string;
  checksumSha256: string | null;
}

export interface DownloadOutcome {
  name: string;
  ok: boolean;
  reason?: string;
}

// Registry entries should only ever point at these hosts. Extend this list
// deliberately (and review) rather than accepting any HTTPS host — this is
// the allowlist referenced in spec §57.
const ALLOWED_DOWNLOAD_HOSTS = [
  "github.com",
  "codeload.github.com",
  "raw.githubusercontent.com",
  "release-assets.githubusercontent.com",
  "hangar.papermc.io",
  "cdn.modrinth.com",
  "media.forgecdn.net", // CurseForge CDN
];

const MAX_JAR_SIZE_BYTES = 200 * 1024 * 1024; // 200MB per plugin/mod jar — sanity cap

/**
 * Downloads a plugin/mod jar into `pluginsDir` only if:
 *  - it has a non-empty downloadUrl (seeded placeholders are skipped, not faked)
 *  - the URL passes the SSRF/allowlist check
 *  - the response's actual SHA-256 matches the registry's checksum, when one is set
 *
 * Never trusts a URL from AI output — this always operates on registry data
 * that an admin curated (spec §57: "De AI mag geen willekeurige URL als
 * downloadbron aanleveren").
 */
export class PluginDownloadService {
  async downloadAll(targets: DownloadTarget[], pluginsDir: string): Promise<DownloadOutcome[]> {
    const outcomes: DownloadOutcome[] = [];
    for (const target of targets) {
      outcomes.push(await this.downloadOne(target, pluginsDir));
    }
    return outcomes;
  }

  private async downloadOne(target: DownloadTarget, pluginsDir: string): Promise<DownloadOutcome> {
    if (!target.downloadUrl) {
      return { name: target.name, ok: false, reason: "No verified download URL configured in the registry yet." };
    }

    try {
      await assertSafeDownloadUrl(target.downloadUrl, ALLOWED_DOWNLOAD_HOSTS);
    } catch (err) {
      logger.warn({ target: target.name, err }, "Rejected plugin download URL");
      return { name: target.name, ok: false, reason: (err as Error).message };
    }

    const fileName = `${target.name.replace(/[^a-zA-Z0-9._-]/g, "_")}.jar`;
    assertSafeFilename(fileName, [".jar"]);
    const destPath = safeResolve(pluginsDir, fileName);
    assertNotSymlink(destPath);

    const res = await fetch(target.downloadUrl, { redirect: "follow" });
    if (!res.ok || !res.body) {
      return { name: target.name, ok: false, reason: `Download failed: HTTP ${res.status}` };
    }

    const contentLength = Number(res.headers.get("content-length") ?? "0");
    if (contentLength > MAX_JAR_SIZE_BYTES) {
      return { name: target.name, ok: false, reason: "File exceeds the maximum allowed size" };
    }

    const hash = crypto.createHash("sha256");
    const chunks: Buffer[] = [];
    let total = 0;

    for await (const chunk of res.body as any) {
      total += chunk.length;
      if (total > MAX_JAR_SIZE_BYTES) {
        return { name: target.name, ok: false, reason: "File exceeds the maximum allowed size (streamed)" };
      }
      hash.update(chunk);
      chunks.push(Buffer.from(chunk));
    }

    const actualChecksum = hash.digest("hex");
    if (target.checksumSha256 && actualChecksum !== target.checksumSha256.toLowerCase()) {
      return { name: target.name, ok: false, reason: "Checksum mismatch — refusing to bundle an unverified file." };
    }

    await fsp.mkdir(path.dirname(destPath), { recursive: true });
    await fsp.writeFile(destPath, Buffer.concat(chunks), { mode: 0o644 });

    return { name: target.name, ok: true };
  }
}

export const pluginDownloadService = new PluginDownloadService();
