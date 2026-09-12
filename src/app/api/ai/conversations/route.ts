import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  const q = req.nextUrl.searchParams.get("q")?.trim();

  const conversations = await prisma.aiConversation.findMany({
    where: {
      userId: session.id,
      // Search both the title and the actual message content — a
      // client-side filter on the already-loaded sidebar list only
      // ever matched titles, since messages aren't loaded there at all.
      ...(q
        ? { OR: [{ title: { contains: q } }, { messages: { some: { content: { contains: q } } } }] }
        : {}),
    },
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
