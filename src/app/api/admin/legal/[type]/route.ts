import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSessionUser } from "@/lib/session";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function isValidType(type: string): type is "terms" | "privacy" {
  return type === "terms" || type === "privacy";
}

export async function GET(_req: Request, { params }: { params: { type: string } }) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;
  if (!isValidType(params.type)) return NextResponse.json({ error: "Unknown document type" }, { status: 404 });

  const doc = await prisma.legalDocument.findUnique({ where: { type: params.type } });
  return NextResponse.json({
    type: params.type,
    draftContent: doc?.draftContent ?? "",
    publishedContent: doc?.publishedContent ?? null,
    publishedAt: doc?.publishedAt ?? null,
    updatedAt: doc?.updatedAt ?? null,
  });
}

const saveSchema = z.object({
  draftContent: z.string().max(50000),
  publish: z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { type: string } }) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;
  if (!isValidType(params.type)) return NextResponse.json({ error: "Unknown document type" }, { status: 404 });

  const parsed = saveSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { draftContent, publish } = parsed.data;
  const doc = await prisma.legalDocument.upsert({
    where: { type: params.type },
    create: {
      type: params.type,
      draftContent,
      ...(publish ? { publishedContent: draftContent, publishedAt: new Date() } : {}),
    },
    update: {
      draftContent,
      ...(publish ? { publishedContent: draftContent, publishedAt: new Date() } : {}),
    },
  });

  await audit(session.id, publish ? "legal_published" : "legal_draft_saved", { documentType: params.type });
  return NextResponse.json(doc);
}
