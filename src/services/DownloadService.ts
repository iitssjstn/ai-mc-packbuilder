import fs from "node:fs";
import { prisma } from "@/lib/prisma";

/**
 * Every download goes through an ownership check server-side (spec §38).
 * The public-facing "download" endpoint takes an opaque ServerPack.id
 * (a UUID, already unguessable) but this service is the actual gate: a
 * user can never fetch another user's pack, admin role or not.
 */
export class DownloadService {
  async getDownloadableStream(packId: string, requestingUserId: string, requestingRole: "USER" | "ADMIN" | "OWNER") {
    const pack = await prisma.serverPack.findUnique({ where: { id: packId } });
    if (!pack) throw new Error("Pack not found");

    const isOwner = pack.userId === requestingUserId;
    const isAdmin = requestingRole === "ADMIN" || requestingRole === "OWNER";
    if (!isOwner && !isAdmin) {
      throw new Error("You do not have permission to download this pack");
    }
    if (pack.status !== "READY" || !pack.filePath) {
      throw new Error("Pack is not ready for download");
    }

    return {
      stream: fs.createReadStream(pack.filePath),
      fileName: `${pack.name.replace(/[^a-zA-Z0-9._-]/g, "_")}-v${pack.version}.zip`,
      sizeBytes: pack.fileSizeBytes ?? 0,
    };
  }
}

export const downloadService = new DownloadService();
