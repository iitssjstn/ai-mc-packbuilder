import dns from "node:dns/promises";
import net from "node:net";

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);

/**
 * Validates a user-supplied "branding" link (Discord, Twitch, webshop, ...).
 * These are stored and displayed as text/config only — the backend never
 * fetches them (spec §22), so this check only needs to stop dangerous
 * schemes and obvious garbage, not SSRF.
 */
export function assertSafeDisplayUrl(rawUrl: string): void {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Not a valid URL");
  }
  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    throw new Error(`Unsupported URL scheme: ${parsed.protocol}`);
  }
}

// Private / reserved ranges a download source must never resolve to.
const PRIVATE_RANGES = [
  /^127\./, /^10\./, /^192\.168\./, /^169\.254\./,
  /^0\./, /^::1$/, /^fc00:/, /^fe80:/,
];

/**
 * Validates a plugin/mod *download source* URL before the pack worker
 * actually fetches it (spec §57). Unlike branding links, these ARE
 * fetched server-side, so this enforces an allowlist plus a DNS-resolution
 * check to prevent SSRF via DNS rebinding to internal addresses.
 *
 * Download sources should really only ever be admin-curated registry
 * entries — this is a last line of defense, not the primary control.
 */
export async function assertSafeDownloadUrl(rawUrl: string, allowedHosts: string[]): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Not a valid download URL");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("Download URLs must use HTTPS");
  }
  if (!allowedHosts.includes(parsed.hostname)) {
    throw new Error(`Download host not in allowlist: ${parsed.hostname}`);
  }

  const addresses = await dns.lookup(parsed.hostname, { all: true });
  for (const { address } of addresses) {
    if (net.isIP(address) && PRIVATE_RANGES.some((re) => re.test(address))) {
      throw new Error(`Download host resolves to a private/internal address: ${address}`);
    }
  }
}
