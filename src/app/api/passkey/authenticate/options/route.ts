import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { expectedOrigin, rpID, setChallengeCookie } from "@/lib/webauthn";

export const dynamic = "force-dynamic";

export async function POST() {
  const origin = expectedOrigin();
  const options = await generateAuthenticationOptions({
    rpID: rpID(origin),
    userVerification: "required",
  });
  await setChallengeCookie("authenticate", options.challenge);
  return NextResponse.json(options);
}
