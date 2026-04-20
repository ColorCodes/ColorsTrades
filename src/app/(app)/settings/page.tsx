import { requireUser } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "./change-password-form";
import { ThemeToggle } from "./theme-toggle";
import { LlmProviderForm } from "./llm-provider-form";
import { PasskeyManager } from "./passkeys";
import { getLlmSettingsState } from "@/lib/llm-settings";
import { prisma } from "@/lib/db";

export default async function SettingsPage() {
  const user = await requireUser();
  const [llmState, passkeys] = await Promise.all([
    getLlmSettingsState(user.id),
    prisma.authenticator.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nickname: true,
        deviceType: true,
        backedUp: true,
        createdAt: true,
        lastUsedAt: true,
      },
    }),
  ]);
  const serverReady = !!process.env.ENCRYPTION_KEY;

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader><CardTitle>Account</CardTitle><CardDescription>Signed in as {user.email}</CardDescription></CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Passkeys</CardTitle>
          <CardDescription>
            Phishing-resistant sign-in with Touch ID, Windows Hello, or a security key. Enrolling any passkey disables password sign-in for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasskeyManager
            initial={passkeys.map((p) => ({
              ...p,
              createdAt: p.createdAt.toISOString(),
              lastUsedAt: p.lastUsedAt?.toISOString() ?? null,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          {passkeys.length > 0 && (
            <CardDescription>
              Password sign-in is currently disabled because you have a passkey enrolled. You can still change it as a backup.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent><ChangePasswordForm /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent><ThemeToggle /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI chat import</CardTitle>
          <CardDescription>
            Pick a provider and drop in an API key. Keys are encrypted at rest and never sent back to the browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {serverReady ? (
            <LlmProviderForm initial={llmState} />
          ) : (
            <p className="text-sm text-destructive">
              Server is missing <code>ENCRYPTION_KEY</code>. Set a 64-char hex value in <code>.env</code> and restart.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
