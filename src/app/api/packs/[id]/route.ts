import { NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  const pack = await prisma.serverPack.findFirst({ where: { id: params.id, userId: session.id } });
  if (!pack) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(pack);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  const pack = await prisma.serverPack.findFirst({ where: { id: params.id, userId: session.id } });
  if (!pack) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.serverPack.delete({ where: { id: pack.id } });
  return new NextResponse(null, { status: 204 });
}
