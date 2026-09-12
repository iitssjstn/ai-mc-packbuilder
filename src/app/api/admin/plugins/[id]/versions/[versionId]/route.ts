import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSessionUser } from "@/lib/session";
import { audit } from "@/lib/audit";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";


export async function DELETE(_req: Request, { params }: { params: { versionId: string } }) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  await prisma.pluginVersion.delete({ where: { id: params.versionId } });
  await audit(session.id, "plugin_version_removed", { versionId: params.versionId });
  return new NextResponse(null, { status: 204 });
}
