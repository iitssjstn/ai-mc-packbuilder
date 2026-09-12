import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isSessionUser } from "@/lib/session";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

export async function GET(req: NextRequest) {
  const session = requireAdmin();
  if (!isSessionUser(session)) return session;

  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1") || 1);
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const role = req.nextUrl.searchParams.get("role");
  const status = req.nextUrl.searchParams.get("status"); // "blocked" | "active"

  const where = {
    ...(q ? { OR: [{ email: { contains: q } }, { username: { contains: q } }] } : {}),
    ...(role ? { role } : {}),
    ...(status === "blocked" ? { isBlocked: true } : status === "active" ? { isBlocked: false } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, email: true, username: true, role: true, isBlocked: true, packLimit: true, createdAt: true },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ items: users, total, page, pageSize: PAGE_SIZE });
}
