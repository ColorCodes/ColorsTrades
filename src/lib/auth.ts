import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";
import { prisma } from "@/lib/db";
import { clientIp, isLockedOut, recordAttempt } from "@/lib/rate-limit";
import { readChallengeCookie, expectedOrigin, rpID } from "@/lib/webauthn";

async function userHasPasskey(userId: string): Promise<boolean> {
  const count = await prisma.authenticator.count({ where: { userId } });
  return count > 0;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      id: "password",
      name: "Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = String(credentials?.email ?? "").toLowerCase().trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const ip = clientIp(request as Request);
        if (await isLockedOut(email, ip)) {
          await recordAttempt({ identifier: email, ip, method: "PASSWORD", success: false });
          throw new Error("Too many failed attempts. Try again in a few minutes.");
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await recordAttempt({ identifier: email, ip, method: "PASSWORD", success: false });
          return null;
        }

        if (await userHasPasskey(user.id)) {
          await recordAttempt({ identifier: email, ip, method: "PASSWORD", success: false });
          throw new Error("Password sign-in is disabled. Use your passkey.");
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        await recordAttempt({ identifier: email, ip, method: "PASSWORD", success: ok });
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
    Credentials({
      id: "passkey",
      name: "Passkey",
      credentials: {
        response: { label: "response", type: "text" },
      },
      async authorize(credentials, request) {
        let resp: AuthenticationResponseJSON;
        try {
          resp = JSON.parse(String(credentials?.response ?? "")) as AuthenticationResponseJSON;
        } catch {
          return null;
        }
        if (!resp?.id) return null;

        const ip = clientIp(request as Request);
        if (await isLockedOut(resp.id, ip)) {
          await recordAttempt({ identifier: resp.id, ip, method: "PASSKEY", success: false });
          throw new Error("Too many failed attempts. Try again in a few minutes.");
        }

        const expectedChallenge = await readChallengeCookie("authenticate");
        if (!expectedChallenge) {
          await recordAttempt({ identifier: resp.id, ip, method: "PASSKEY", success: false });
          throw new Error("Challenge expired. Try again.");
        }

        const authenticator = await prisma.authenticator.findUnique({
          where: { credentialId: resp.id },
          include: { user: true },
        });
        if (!authenticator) {
          await recordAttempt({ identifier: resp.id, ip, method: "PASSKEY", success: false });
          return null;
        }

        let verification;
        try {
          verification = await verifyAuthenticationResponse({
            response: resp,
            expectedChallenge,
            expectedOrigin: expectedOrigin(),
            expectedRPID: rpID(expectedOrigin()),
            authenticator: {
              credentialID: Buffer.from(authenticator.credentialId, "base64url"),
              credentialPublicKey: new Uint8Array(authenticator.credentialPublicKey),
              counter: Number(authenticator.counter),
              transports: authenticator.transports as AuthenticatorTransport[],
            },
            requireUserVerification: true,
          });
        } catch {
          await recordAttempt({ identifier: resp.id, ip, method: "PASSKEY", success: false });
          return null;
        }

        if (!verification.verified) {
          await recordAttempt({ identifier: resp.id, ip, method: "PASSKEY", success: false });
          return null;
        }

        await prisma.authenticator.update({
          where: { id: authenticator.id },
          data: {
            counter: BigInt(verification.authenticationInfo.newCounter),
            lastUsedAt: new Date(),
          },
        });

        await recordAttempt({ identifier: resp.id, ip, method: "PASSKEY", success: true });
        return {
          id: authenticator.user.id,
          email: authenticator.user.email,
          name: authenticator.user.name ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.uid) session.user.id = String(token.uid);
      return session;
    },
  },
});
