import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Public — no auth. Only ever returns the published version, never the
// draft, since a draft may contain content not yet approved for
// publication.
export async function GET(_req: Request, { params }: { params: { type: string } }) {
  if (params.type !== "terms" && params.type !== "privacy") {
    return NextResponse.json({ error: "Unknown document type" }, { status: 404 });
  }

  const doc = await prisma.legalDocument.findUnique({ where: { type: params.type } });
  return NextResponse.json({
    type: params.type,
    content: doc?.publishedContent ?? null,
    publishedAt: doc?.publishedAt ?? null,
  });
}
