import { NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/session";
import { creditService } from "@/services/CreditService";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  const balance = await creditService.getBalance(session.id);
  const unlimited = session.role === "ADMIN" || session.role === "OWNER";
  return NextResponse.json({ balance, unlimited });
}
