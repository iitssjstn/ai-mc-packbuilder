import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, isSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";


export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  const pack = await prisma.serverPack.findFirst({ where: { id: params.id, userId: session.id } });
  if (!pack) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(pack);
}

const renameSchema = z.object({ name: z.string().min(1).max(100) });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  const parsed = renameSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const pack = await prisma.serverPack.findFirst({ where: { id: params.id, userId: session.id } });
  if (!pack) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.serverPack.update({ where: { id: pack.id }, data: { name: parsed.data.name } });
  return NextResponse.json({ id: updated.id, name: updated.name });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  const pack = await prisma.serverPack.findFirst({ where: { id: params.id, userId: session.id } });
  if (!pack) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.serverPack.delete({ where: { id: pack.id } });
  return new NextResponse(null, { status: 204 });
}
