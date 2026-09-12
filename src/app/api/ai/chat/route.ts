import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isSessionUser } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { aiService } from "@/services/AIService";

const chatSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
});

export async function POST(req: NextRequest) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  if (!rateLimit(`ai-chat:${session.id}`, env.AI_MAX_REQUESTS_PER_MINUTE, 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many AI requests, slow down" }, { status: 429 });
  }

  const parsed = chatSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const userId = session.id;
  let conversation = parsed.data.conversationId
    ? await prisma.aiConversation.findFirst({ where: { id: parsed.data.conversationId, userId } })
    : null;

  if (!conversation) {
    conversation = await prisma.aiConversation.create({ data: { userId } });
  }

  await prisma.aiMessage.create({
    data: { conversationId: conversation.id, role: "USER", content: parsed.data.message },
  });

  const priorMessages = await prisma.aiMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  try {
    const { reply, plan } = await aiService.chat(
      priorMessages.map((m: { role: string; content: string }) => ({ role: m.role.toLowerCase() as "user" | "assistant", content: m.content }))
    );

    await prisma.aiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: reply,
        structuredData: plan ?? undefined,
      },
    });

    if (plan) {
      await prisma.aiConversation.update({ where: { id: conversation.id }, data: { planDraft: plan } });
    }

    return NextResponse.json({ conversationId: conversation.id, reply, plan });
  } catch {
    return NextResponse.json(
      { error: "AI service is currently unavailable. Please try again shortly." },
      { status: 503 }
    );
  }
}
