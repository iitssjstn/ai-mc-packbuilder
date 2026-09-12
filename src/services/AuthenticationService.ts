import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

const BCRYPT_ROUNDS = 12;

export interface JwtPayload {
  sub: string;
  role: "USER" | "ADMIN" | "OWNER";
}

export class AuthenticationService {
  async hasOwner(): Promise<boolean> {
    const owner = await prisma.user.findFirst({ where: { role: "OWNER" } });
    return owner !== null;
  }

  /** One-time /setup wizard. Never callable once an owner exists. */
  async createOwner(email: string, username: string, password: string) {
    if (await this.hasOwner()) {
      throw new Error("Setup has already been completed — an owner already exists.");
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    return prisma.user.create({ data: { email, username, passwordHash, role: "OWNER" } });
  }

  async register(email: string, username: string, password: string) {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    return prisma.user.create({ data: { email, username, passwordHash, role: "USER" } });
  }

  async verifyCredentials(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    if (user.isBlocked) throw new Error("This account has been blocked.");
    const valid = await bcrypt.compare(password, user.passwordHash);
    return valid ? user : null;
  }

  /** Lets a logged-in user change their own email/username/password.
   * Always requires the current password, regardless of which fields
   * are being changed — this is a self-service identity change, not an
   * admin action, so it needs its own proof of authorization even
   * though the request is already authenticated via the session cookie. */
  async updateOwnProfile(
    userId: string,
    currentPassword: string,
    changes: { email?: string; username?: string; newPassword?: string }
  ) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new Error("Current password is incorrect");

    const data: { email?: string; username?: string; passwordHash?: string } = {};
    if (changes.email && changes.email !== user.email) data.email = changes.email;
    if (changes.username && changes.username !== user.username) data.username = changes.username;
    if (changes.newPassword) data.passwordHash = await bcrypt.hash(changes.newPassword, BCRYPT_ROUNDS);

    if (Object.keys(data).length === 0) return user;
    return prisma.user.update({ where: { id: userId }, data });
  }

  issueToken(userId: string, role: JwtPayload["role"], rememberMe = false): string {
    return jwt.sign({ sub: userId, role } as JwtPayload, env.JWT_SECRET, {
      expiresIn: (rememberMe ? "30d" : env.JWT_EXPIRES_IN) as jwt.SignOptions["expiresIn"],
    });
  }

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  }
}

export const authenticationService = new AuthenticationService();
