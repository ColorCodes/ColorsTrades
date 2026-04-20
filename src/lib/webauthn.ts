import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME_REG = "ct-webauthn-reg";
const COOKIE_NAME_AUTH = "ct-webauthn-auth";
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export type ChallengeKind = "register" | "authenticate";

function cookieName(kind: ChallengeKind) {
  return kind === "register" ? COOKIE_NAME_REG : COOKIE_NAME_AUTH;
}

function sign(payload: string): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function rpID(origin: string): string {
  return new URL(origin).hostname;
}

export function expectedOrigin(): string {
  const url = process.env.NEXTAUTH_URL;
  if (!url) throw new Error("NEXTAUTH_URL is not set");
  return url.replace(/\/$/, "");
}

export async function setChallengeCookie(kind: ChallengeKind, challenge: string): Promise<void> {
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;
  const payload = `${challenge}.${expiresAt}`;
  const value = `${payload}.${sign(payload)}`;
  const store = await cookies();
  store.set({
    name: cookieName(kind),
    value,
    httpOnly: true,
    sameSite: "strict",
    secure: expectedOrigin().startsWith("https://"),
    maxAge: Math.floor(CHALLENGE_TTL_MS / 1000),
    path: "/",
  });
}

export async function readChallengeCookie(kind: ChallengeKind): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(cookieName(kind))?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [challenge, expiresAtStr, sig] = parts as [string, string, string];
  const expected = sign(`${challenge}.${expiresAtStr}`);
  if (!safeEq(sig, expected)) return null;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
  return challenge;
}

export async function clearChallengeCookie(kind: ChallengeKind): Promise<void> {
  const store = await cookies();
  store.delete(cookieName(kind));
}
