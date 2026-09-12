import { NextResponse } from "next/server";
import { authenticationService } from "@/services/AuthenticationService";

export async function GET() {
  return NextResponse.json({ setupComplete: await authenticationService.hasOwner() });
}
