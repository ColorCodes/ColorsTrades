import { prisma } from "@/lib/db";
import type { LoginMethod } from "@prisma/client";

export const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
export const LOCKOUT_MAX_FAILURES_PER_IDENTIFIER = 5;
export const LOCKOUT_MAX_FAILURES_PER_IP = 20;

export function clientIp(request: Request | { headers: Headers }): string | null {
  const h = request.headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip");
}

export async function isLockedOut(identifier: string, ip: string | null): Promise<boolean> {
  const since = new Date(Date.now() - LOCKOUT_WINDOW_MS);
  const [byId, byIp] = await Promise.all([
    prisma.loginAttempt.count({
      where: { identifier, success: false, createdAt: { gte: since } },
    }),
    ip
      ? prisma.loginAttempt.count({
          where: { ip, success: false, createdAt: { gte: since } },
        })
      : Promise.resolve(0),
  ]);
  return byId >= LOCKOUT_MAX_FAILURES_PER_IDENTIFIER || byIp >= LOCKOUT_MAX_FAILURES_PER_IP;
}

export async function recordAttempt(params: {
  identifier: string;
  ip: string | null;
  method: LoginMethod;
  success: boolean;
}): Promise<void> {
  await prisma.loginAttempt.create({
    data: {
      identifier: params.identifier,
      ip: params.ip,
      method: params.method,
      success: params.success,
    },
  });
  if (params.success) {
    await prisma.loginAttempt
      .deleteMany({ where: { identifier: params.identifier, success: false } })
      .catch(() => {});
  }
}
