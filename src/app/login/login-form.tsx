"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { startAuthentication } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("password", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      toast.error(res.error === "CredentialsSignin" ? "Invalid credentials" : res.error);
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  async function onPasskey() {
    setPasskeyLoading(true);
    try {
      const optionsRes = await fetch("/api/passkey/authenticate/options", { method: "POST" });
      if (!optionsRes.ok) throw new Error("Could not start passkey sign-in");
      const options = await optionsRes.json();
      const assertion = await startAuthentication(options);
      const res = await signIn("passkey", {
        response: JSON.stringify(assertion),
        redirect: false,
      });
      if (res?.error) {
        toast.error(res.error === "CredentialsSignin" ? "Passkey rejected" : res.error);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      if ((err as Error)?.name === "NotAllowedError") return;
      toast.error(err instanceof Error ? err.message : "Passkey sign-in failed");
    } finally {
      setPasskeyLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-6 shadow-sm">
      <Button type="button" onClick={onPasskey} disabled={passkeyLoading} variant="outline">
        {passkeyLoading ? "Waiting for passkey…" : "Sign in with passkey"}
      </Button>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>or with password</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
      </form>
    </div>
  );
}
