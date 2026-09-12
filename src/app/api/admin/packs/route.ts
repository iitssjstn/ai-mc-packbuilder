import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const packs = await prisma.serverPack.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      name: true,
      status: true,
      errorMessage: true,
      createdAt: true,
      minecraftVersionId: true,
      user: { select: { username: true } },
    },
  });

  return NextResponse.json(
    packs.map((p: (typeof packs)[number]) => ({
      id: p.id,
      name: p.name,
      status: p.status,
      errorMessage: p.errorMessage,
      createdAt: p.createdAt,
      minecraftVersionId: p.minecraftVersionId,
      owner: p.user.username,
    }))
  );
}
