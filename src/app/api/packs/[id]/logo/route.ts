import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { brandingService } from "@/services/BrandingService";

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  const pack = await prisma.serverPack.findFirst({ where: { id: params.id, userId: session.id } });
  if (!pack) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (pack.status !== "DRAFT") {
    return NextResponse.json({ error: "Logo can only be attached before generation" }, { status: 409 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("logo");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File exceeds the 2MB limit" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    await brandingService.saveLogo(params.id, session.id, buffer);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
