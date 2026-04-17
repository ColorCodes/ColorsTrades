import { requireUser } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChangePasswordForm } from "./change-password-form";
import { ThemeToggle } from "./theme-toggle";

export default async function SettingsPage() {
  const user = await requireUser();
  const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY;

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h1 className="text-xl sm:text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader><CardTitle>Account</CardTitle><CardDescription>Signed in as {user.email}</CardDescription></CardHeader>
      </Card>

      <Card>
        <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
        <CardContent><ChangePasswordForm /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent><ThemeToggle /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>AI chat import</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-sm">Anthropic key:</span>
            {hasAnthropicKey
              ? <Badge variant="success">Configured</Badge>
              : <Badge variant="secondary">Not configured</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Set <code>ANTHROPIC_API_KEY</code> in your <code>.env</code> to enable the AI importer.</p>
        </CardContent>
      </Card>
    </div>
  );
}
