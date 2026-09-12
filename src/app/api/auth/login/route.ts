import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticationService } from "@/services/AuthenticationService";
import { setSessionCookie } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { Role } from "@/lib/enums";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";


const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
  rememberMe: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });
  }

  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const user = await authenticationService.verifyCredentials(parsed.data.email, parsed.data.password);
    if (!user) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });

    const token = authenticationService.issueToken(user.id, user.role as Role, parsed.data.rememberMe);
    setSessionCookie(token, parsed.data.rememberMe);

    return NextResponse.json({ id: user.id, email: user.email, username: user.username, role: user.role });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 403 });
  }
}
