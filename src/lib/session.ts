import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { authenticationService } from "@/services/AuthenticationService";

export interface SessionUser {
  id: string;
  role: "USER" | "ADMIN" | "OWNER";
}

const COOKIE_NAME = "session";

export function getSessionUser(): SessionUser | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = authenticationService.verifyToken(token);
    return { id: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

/** Call at the top of any route handler that requires a logged-in user.
 * Returns the user, or a ready-to-return 401 NextResponse. */
export function requireAuth(): SessionUser | NextResponse {
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return user;
}

export function requireRole(user: SessionUser, ...roles: SessionUser["role"][]): NextResponse | null {
  if (!roles.includes(user.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  return null;
}

export function isSessionUser(value: SessionUser | NextResponse): value is SessionUser {
  return !(value instanceof NextResponse);
}

/** Convenience for admin-only routes: auth + role check in one call. */
export function requireAdmin(): SessionUser | NextResponse {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;
  const roleError = requireRole(session, "ADMIN", "OWNER");
  if (roleError) return roleError;
  return session;
}

export function setSessionCookie(token: string, rememberMe = false) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // "Remember me" unchecked: a session cookie (no maxAge) that the
    // browser drops on close, rather than always persisting for a week
    // regardless of what the user asked for.
    ...(rememberMe ? { maxAge: 30 * 24 * 60 * 60 } : {}),
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}
