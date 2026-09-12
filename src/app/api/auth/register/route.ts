import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticationService } from "@/services/AuthenticationService";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";
import { Role } from "@/lib/enums";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";


const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(10).max(128),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: "You must accept the Terms to sign up" }) }),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`register:${ip}`, 10, 15 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });
  }

  const registrationSetting = await prisma.systemSetting.findUnique({ where: { key: "registrationEnabled" } });
  if (registrationSetting?.value === "false") {
    return NextResponse.json({ error: "Registration is currently disabled" }, { status: 403 });
  }

  const parsed = registerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { email, username, password } = parsed.data;
  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) return NextResponse.json({ error: "Email or username already in use" }, { status: 409 });

  const user = await authenticationService.register(email, username, password);
  await prisma.user.update({ where: { id: user.id }, data: { termsAcceptedAt: new Date() } });
  const token = authenticationService.issueToken(user.id, user.role as Role);
  setSessionCookie(token);

  return NextResponse.json(
    { id: user.id, email: user.email, username: user.username, role: user.role },
    { status: 201 }
  );
}
