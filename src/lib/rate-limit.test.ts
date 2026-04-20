import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/db", () => {
  const store: Array<{ identifier: string; ip: string | null; method: string; success: boolean; createdAt: Date }> = [];
  return {
    prisma: {
      __store: store,
      loginAttempt: {
        count: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
          const since = (where.createdAt as { gte: Date } | undefined)?.gte ?? new Date(0);
          return store.filter(
            (row) =>
              (where.identifier === undefined || row.identifier === where.identifier) &&
              (where.ip === undefined || row.ip === where.ip) &&
              (where.success === undefined || row.success === where.success) &&
              row.createdAt >= since,
          ).length;
        }),
        create: vi.fn(async ({ data }: { data: { identifier: string; ip: string | null; method: string; success: boolean } }) => {
          store.push({ ...data, createdAt: new Date() });
          return data;
        }),
        deleteMany: vi.fn(async ({ where }: { where: { identifier: string; success: boolean } }) => {
          const before = store.length;
          for (let i = store.length - 1; i >= 0; i--) {
            const row = store[i]!;
            if (row.identifier === where.identifier && row.success === where.success) store.splice(i, 1);
          }
          return { count: before - store.length };
        }),
      },
    },
  };
});

import { isLockedOut, recordAttempt, clientIp, LOCKOUT_MAX_FAILURES_PER_IDENTIFIER } from "./rate-limit";
import { prisma } from "@/lib/db";

beforeEach(() => {
  (prisma as unknown as { __store: unknown[] }).__store.length = 0;
});

describe("clientIp", () => {
  it("reads the first x-forwarded-for entry", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(clientIp(req)).toBe("1.2.3.4");
  });
  it("falls back to x-real-ip", () => {
    const req = new Request("http://x", { headers: { "x-real-ip": "9.9.9.9" } });
    expect(clientIp(req)).toBe("9.9.9.9");
  });
  it("returns null when neither is set", () => {
    const req = new Request("http://x");
    expect(clientIp(req)).toBeNull();
  });
});

describe("isLockedOut + recordAttempt", () => {
  it("locks after the max failed attempts for an identifier", async () => {
    for (let i = 0; i < LOCKOUT_MAX_FAILURES_PER_IDENTIFIER; i++) {
      await recordAttempt({ identifier: "a@b.co", ip: "1.1.1.1", method: "PASSWORD", success: false });
    }
    expect(await isLockedOut("a@b.co", "1.1.1.1")).toBe(true);
  });

  it("does not lock before the threshold", async () => {
    await recordAttempt({ identifier: "a@b.co", ip: "1.1.1.1", method: "PASSWORD", success: false });
    expect(await isLockedOut("a@b.co", "1.1.1.1")).toBe(false);
  });

  it("clears the identifier's failures on a successful attempt", async () => {
    for (let i = 0; i < LOCKOUT_MAX_FAILURES_PER_IDENTIFIER - 1; i++) {
      await recordAttempt({ identifier: "a@b.co", ip: "1.1.1.1", method: "PASSWORD", success: false });
    }
    await recordAttempt({ identifier: "a@b.co", ip: "1.1.1.1", method: "PASSWORD", success: true });
    expect(await isLockedOut("a@b.co", "1.1.1.1")).toBe(false);
  });
});
