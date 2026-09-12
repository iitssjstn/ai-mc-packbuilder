import { prisma } from "@/lib/prisma";

const FREE_SIGNUP_CREDITS = 10;
const GENERATION_COST = 1;

/**
 * No payment provider is wired up yet, but usage enforcement already
 * runs entirely server-side through these tables — the frontend never
 * decides whether a generation is authorized, it only reflects what
 * the backend already checked. Once real payments exist, "purchase"
 * transactions slot into the same CreditTransaction table without
 * changing this contract.
 */
export class CreditService {
  async grantSignupCredits(userId: string) {
    await prisma.creditBalance.create({ data: { userId, balance: FREE_SIGNUP_CREDITS } });
    await prisma.creditTransaction.create({
      data: { userId, amount: FREE_SIGNUP_CREDITS, type: "free_grant" },
    });
  }

  async getBalance(userId: string): Promise<number> {
    const row = await prisma.creditBalance.findUnique({ where: { userId } });
    return row?.balance ?? 0;
  }

  /** Throws if the user has no credits left — call this, and only
   * proceed with generation if it doesn't throw. This is the actual
   * enforcement point; a frontend "can I generate?" check is never
   * sufficient on its own. */
  async chargeForGeneration(userId: string, packId: string): Promise<void> {
    const balance = await this.getBalance(userId);
    if (balance < GENERATION_COST) {
      throw new Error("You're out of credits for generating server packs.");
    }
    await prisma.creditBalance.update({
      where: { userId },
      data: { balance: { decrement: GENERATION_COST } },
    });
    await prisma.creditTransaction.create({
      data: { userId, amount: -GENERATION_COST, type: "generation_charge", relatedPackId: packId },
    });
  }

  async refundGeneration(userId: string, packId: string): Promise<void> {
    await prisma.creditBalance.update({
      where: { userId },
      data: { balance: { increment: GENERATION_COST } },
    });
    await prisma.creditTransaction.create({
      data: { userId, amount: GENERATION_COST, type: "refund", relatedPackId: packId, status: "refunded" },
    });
  }
}

export const creditService = new CreditService();
export { GENERATION_COST };
