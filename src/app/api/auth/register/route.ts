import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticationService } from "@/services/AuthenticationService";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/session";
import { rateLimit } from "@/lib/rateLimit";

const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(10).max(128),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`register:${ip}`, 10, 15 * 60 * 1000).allowed) {
    return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });
  }

  const parsed = registerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { email, username, password } = parsed.data;
  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) return NextResponse.json({ error: "Email or username already in use" }, { status: 409 });

  const user = await authenticationService.register(email, username, password);
  const token = authenticationService.issueToken(user.id, user.role);
  setSessionCookie(token);

  return NextResponse.json(
    { id: user.id, email: user.email, username: user.username, role: user.role },
    { status: 201 }
  );
}
