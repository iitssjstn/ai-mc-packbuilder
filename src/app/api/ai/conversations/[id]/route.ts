import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { fromJsonString } from "@/lib/json";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  const conversation = await prisma.aiConversation.findFirst({
    where: { id: params.id, userId: session.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: conversation.id,
    title: conversation.title ?? "New Conversation",
    plan: conversation.planDraft ? fromJsonString(conversation.planDraft) : null,
    messages: conversation.messages.map((m: (typeof conversation.messages)[number]) => ({
      role: m.role.toLowerCase(),
      content: m.content,
    })),
  });
}

const renameSchema = z.object({ title: z.string().min(1).max(100) });

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  const parsed = renameSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const conversation = await prisma.aiConversation.findFirst({ where: { id: params.id, userId: session.id } });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.aiConversation.update({ where: { id: conversation.id }, data: { title: parsed.data.title } });
  return NextResponse.json({ id: updated.id, title: updated.title });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  const conversation = await prisma.aiConversation.findFirst({ where: { id: params.id, userId: session.id } });
  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.aiConversation.delete({ where: { id: conversation.id } });
  return new NextResponse(null, { status: 204 });
}
