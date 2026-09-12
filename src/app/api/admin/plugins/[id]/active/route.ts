import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSessionUser } from "@/lib/session";
import { audit } from "@/lib/audit";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const body = await req.json().catch(() => null);
  if (typeof body?.isActive !== "boolean") {
    return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
  }

  const plugin = await prisma.plugin.update({ where: { id: params.id }, data: { isActive: body.isActive } });
  await audit(session.id, "plugin_toggled", { slug: plugin.slug, isActive: plugin.isActive });
  return NextResponse.json(plugin);
}
