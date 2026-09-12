import { prisma } from "@/lib/prisma";

/** Never pass passwords/tokens/secrets in `details` — audit logs are read
 * by admins but must never surface credentials. */
export async function audit(userId: string, action: string, details?: unknown) {
  await prisma.auditLog.create({ data: { userId, action, details: details as any } });
}
