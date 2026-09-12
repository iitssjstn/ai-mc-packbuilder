import { NextResponse } from "next/server";
import { authenticationService } from "@/services/AuthenticationService";

// All routes here touch the database/cookies at request time and
// must never be statically prerendered during `next build` (which
// runs against a placeholder DATABASE_URL with no real database).
export const dynamic = "force-dynamic";


export async function GET() {
  return NextResponse.json({ setupComplete: await authenticationService.hasOwner() });
}
