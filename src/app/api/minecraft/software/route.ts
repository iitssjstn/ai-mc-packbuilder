import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const software = await prisma.serverSoftware.findMany();
  return NextResponse.json(software.map((s: { type: string; kind: string; name: string }) => ({ type: s.type, kind: s.kind, name: s.name })));
}
