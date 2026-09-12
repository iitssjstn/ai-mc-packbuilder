import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/lib/enums";

export async function notify(userId: string, type: NotificationType, message: string) {
  await prisma.notification.create({ data: { userId, type, message } });
}
