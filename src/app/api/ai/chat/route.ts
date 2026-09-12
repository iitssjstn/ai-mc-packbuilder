import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isSessionUser } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { aiService } from "@/services/AIService";
import { toJsonString } from "@/lib/json";
import { logger } from "@/lib/logger";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";


const chatSchema = z.object({
  // .nullish() (not just .optional()) because the frontend's React state
  // starts as `null` before a conversation exists, and JSON.stringify
  // keeps that null in the request body rather than omitting the key.
  conversationId: z.string().uuid().nullish(),
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

  const isFirstMessage = !conversation;
  if (!conversation) {
    conversation = await prisma.aiConversation.create({ data: { userId } });
  }

  await prisma.aiMessage.create({
    data: { conversationId: conversation.id, role: "USER", content: parsed.data.message },
  });

  // Auto-title from the first message rather than a separate AI call —
  // cheap, instant, and good enough to distinguish conversations in the
  // sidebar list. The user can always rename it manually afterwards.
  if (isFirstMessage) {
    const title = parsed.data.message.slice(0, 60).trim();
    await prisma.aiConversation.update({
      where: { id: conversation.id },
      data: { title: title.length < parsed.data.message.length ? `${title}...` : title },
    });
  }

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
        structuredData: plan ? toJsonString(plan) : undefined,
      },
    });

    if (plan) {
      await prisma.aiConversation.update({ where: { id: conversation.id }, data: { planDraft: toJsonString(plan) } });
    }

    return NextResponse.json({ conversationId: conversation.id, reply, plan });
  } catch (err) {
    // Was previously swallowed entirely — logging it is the only way to
    // tell "no keys configured" apart from "every provider errored" apart
    // from "decrypt failed" etc. from the docker logs.
    logger.error({ err }, "AI chat failed — all configured providers/keys exhausted or errored");
    return NextResponse.json(
      { error: "AI service is currently unavailable. Please try again shortly." },
      { status: 503 }
    );
  }
}
