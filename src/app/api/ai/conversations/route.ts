import { NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  const conversations = await prisma.aiConversation.findMany({
    where: { userId: session.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true, planDraft: true },
    take: 100,
  });

  return NextResponse.json(
    conversations.map((c: (typeof conversations)[number]) => ({
      id: c.id,
      title: c.title ?? "New Conversation",
      updatedAt: c.updatedAt,
      hasPlan: c.planDraft !== null,
    }))
  );
}
