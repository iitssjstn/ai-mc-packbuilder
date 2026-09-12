import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSessionUser } from "@/lib/session";

export async function GET() {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const mods = await prisma.mod.findMany({ include: { versions: true } });
  return NextResponse.json(mods);
}
