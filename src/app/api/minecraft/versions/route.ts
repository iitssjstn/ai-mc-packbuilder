import { NextResponse } from "next/server";
import { minecraftVersionService } from "@/services/MinecraftVersionService";

export async function GET() {
  const versions = await minecraftVersionService.list();
  return NextResponse.json(versions.map((v: { version: string }) => v.version));
}
