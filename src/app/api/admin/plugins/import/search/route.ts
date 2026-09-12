import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isSessionUser } from "@/lib/session";
import { modrinthService } from "@/services/ModrinthService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "Missing query" }, { status: 400 });

  try {
    const results = await modrinthService.search(q);
    return NextResponse.json(results);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
