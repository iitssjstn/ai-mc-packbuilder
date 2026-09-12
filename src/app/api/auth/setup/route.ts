import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticationService } from "@/services/AuthenticationService";
import { setSessionCookie } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";


const setupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(10).max(128),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`setup:${ip}`, 10, 15 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });
  }

  const parsed = setupSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  if (await authenticationService.hasOwner()) {
    return NextResponse.json({ error: "Setup has already been completed" }, { status: 403 });
  }

  const { email, username, password } = parsed.data;
  const owner = await authenticationService.createOwner(email, username, password);
  const token = authenticationService.issueToken(owner.id, "OWNER");
  setSessionCookie(token);

  return NextResponse.json({ id: owner.id, email: owner.email, role: owner.role }, { status: 201 });
}
