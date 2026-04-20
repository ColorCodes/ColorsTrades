import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { clearChallengeCookie, expectedOrigin, readChallengeCookie, rpID } from "@/lib/webauthn";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  response: z.unknown(),
  nickname: z.string().trim().max(80).optional(),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();

  const body = bodySchema.parse(await req.json());
  const challenge = await readChallengeCookie("register");
  if (!challenge) {
    return NextResponse.json({ error: "Challenge expired. Try again." }, { status: 400 });
  }

  const origin = expectedOrigin();
  const verification = await verifyRegistrationResponse({
    response: body.response as RegistrationResponseJSON,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpID(origin),
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  const { credentialID, credentialPublicKey, counter, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  const credentialIdB64 = Buffer.from(credentialID).toString("base64url");
  const transports =
    (body.response as { response?: { transports?: string[] } })?.response?.transports ?? [];

  await prisma.authenticator.create({
    data: {
      userId: user.id,
      credentialId: credentialIdB64,
      credentialPublicKey: Buffer.from(credentialPublicKey),
      counter: BigInt(counter),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports,
      nickname: body.nickname ?? null,
    },
  });

  await clearChallengeCookie("register");
  return NextResponse.json({ ok: true });
}
