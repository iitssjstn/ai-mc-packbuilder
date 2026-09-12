import { NextRequest, NextResponse } from "next/server";

// The root layout is a Server Component and has no direct way to read
// the current pathname — this makes it available via headers() so the
// layout can decide whether to render the public NavBar/max-width
// wrapper (everywhere) or leave that entirely to the admin/app shells
// (Admin Panel, which must not show the normal site header at all).
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-pathname", request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: "/:path*",
};
