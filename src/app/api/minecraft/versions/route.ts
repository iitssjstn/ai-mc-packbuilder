import { NextResponse } from "next/server";
import { minecraftVersionService } from "@/services/MinecraftVersionService";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";


export async function GET() {
  const versions = await minecraftVersionService.list();
  return NextResponse.json(versions.map((v: { version: string }) => v.version));
}
