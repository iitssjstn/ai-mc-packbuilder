import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";


export async function GET() {
  const software = await prisma.serverSoftware.findMany();
  return NextResponse.json(software.map((s: { type: string; kind: string; name: string }) => ({ type: s.type, kind: s.kind, name: s.name })));
}
