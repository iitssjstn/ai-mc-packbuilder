import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1") || 1);
  const status = req.nextUrl.searchParams.get("status");

  const where = status ? { status } : {};

  const [packs, total] = await Promise.all([
    prisma.serverPack.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        status: true,
        generationStep: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
        minecraftVersionId: true,
        user: { select: { username: true } },
      },
    }),
    prisma.serverPack.count({ where }),
  ]);

  return NextResponse.json({
    items: packs.map((p: (typeof packs)[number]) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      generationStep: p.generationStep,
      errorMessage: p.errorMessage,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      minecraftVersionId: p.minecraftVersionId,
      owner: p.user.username,
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
  });
}
