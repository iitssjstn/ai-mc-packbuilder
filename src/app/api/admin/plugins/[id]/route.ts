import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSessionUser } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const plugin = await prisma.plugin.delete({ where: { id: params.id } });
  await audit(session.id, "plugin_removed", { slug: plugin.slug });
  return new NextResponse(null, { status: 204 });
}
