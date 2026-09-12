import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSessionUser } from "@/lib/session";
import { modrinthService } from "@/services/ModrinthService";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const bulkSchema = z.object({
  // One name per line from a textarea — capped so this can't be used
  // to hammer Modrinth's API with an unbounded list in one request.
  names: z.array(z.string().min(1).max(100)).min(1).max(50),
});

export async function POST(req: NextRequest) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const parsed = bulkSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  // Dedupe the input itself first (case-insensitive, trimmed) — two
  // lines that are literally the same name shouldn't cost two Modrinth
  // round-trips.
  const seenNames = new Set<string>();
  const uniqueNames = parsed.data.names.filter((n) => {
    const key = n.trim().toLowerCase();
    if (seenNames.has(key)) return false;
    seenNames.add(key);
    return true;
  });

  const results: Array<
    | { name: string; status: "imported"; slug: string; title?: string; versionAdded: boolean }
    | { name: string; status: "not_found" }
    | { name: string; status: "duplicate"; slug: string }
    | { name: string; status: "error"; message: string }
  > = [];
  // Also dedupe by resulting slug — two differently-typed names
  // ("EssentialsX" / "essentials x") can both resolve to the same
  // Modrinth project. The second one is a duplicate result, not a
  // second real import, even though the input strings differed.
  const seenSlugs = new Set<string>();

  // Sequential, not Promise.all — each import already makes several
  // Modrinth requests (search + version list + file download); running
  // many of those concurrently would be exactly the kind of API
  // hammering a reasonable client shouldn't do.
  for (const name of uniqueNames) {
    try {
      const result = await modrinthService.importByName(prisma, name);
      if (result.status === "imported" && result.slug) {
        if (seenSlugs.has(result.slug)) {
          results.push({ name, status: "duplicate" as const, slug: result.slug });
          continue;
        }
        seenSlugs.add(result.slug);
      }
      results.push(result);
    } catch (err) {
      results.push({ name, status: "error" as const, message: (err as Error).message });
    }
  }

  await audit(session.id, "plugins_bulk_imported_from_modrinth", {
    count: uniqueNames.length,
    imported: results.filter((r) => r.status === "imported").length,
  });

  return NextResponse.json({ results });
}
