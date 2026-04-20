import { NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { expectedOrigin, rpID, setChallengeCookie } from "@/lib/webauthn";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await requireUser();
  const existing = await prisma.authenticator.findMany({
    where: { userId: user.id },
    select: { credentialId: true, transports: true },
  });

  const origin = expectedOrigin();
  const options = await generateRegistrationOptions({
    rpName: "ColorsTrades",
    rpID: rpID(origin),
    userID: user.id,
    userName: user.email ?? user.id,
    attestationType: "none",
    excludeCredentials: existing.map((e) => ({
      id: Buffer.from(e.credentialId, "base64url"),
      type: "public-key",
      transports: e.transports as AuthenticatorTransport[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
    },
  });

  await setChallengeCookie("register", options.challenge);
  return NextResponse.json(options);
}
