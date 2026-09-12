import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

export async function POST() {
  clearSessionCookie();
  return new NextResponse(null, { status: 204 });
}
