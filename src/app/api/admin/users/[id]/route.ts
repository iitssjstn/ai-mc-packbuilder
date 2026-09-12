import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      isBlocked: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [packCount, conversationCount, recentPacks, recentAudit, credits] = await Promise.all([
    prisma.serverPack.count({ where: { userId: user.id } }),
    prisma.aiConversation.count({ where: { userId: user.id } }),
    prisma.serverPack.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, status: true, createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: { details: { contains: user.id } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { action: true, createdAt: true },
    }),
    prisma.creditBalance.findUnique({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    ...user,
    packCount,
    conversationCount,
    creditBalance: credits?.balance ?? 0,
    recentPacks,
    recentAudit,
  });
}
