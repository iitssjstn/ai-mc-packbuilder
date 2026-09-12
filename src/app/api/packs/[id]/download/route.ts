import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { requireAuth, isSessionUser } from "@/lib/session";
import { downloadService } from "@/services/DownloadService";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = requireAuth();
  if (!isSessionUser(session)) return session;

  try {
    const { stream, fileName, sizeBytes } = await downloadService.getDownloadableStream(
      params.id,
      session.id,
      session.role
    );

    const webStream = Readable.toWeb(stream) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "application/zip",
        "Content-Length": String(sizeBytes),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 403 });
  }
}
