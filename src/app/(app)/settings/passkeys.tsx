"use client";
import * as React from "react";
import { toast } from "sonner";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Passkey = {
  id: string;
  nickname: string | null;
  deviceType: string;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

export function PasskeyManager({ initial }: { initial: Passkey[] }) {
  const [passkeys, setPasskeys] = React.useState<Passkey[]>(initial);
  const [nickname, setNickname] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function enroll(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const optionsRes = await fetch("/api/passkey/register/options", { method: "POST" });
      if (!optionsRes.ok) throw new Error((await optionsRes.json()).error ?? "Could not start enrollment");
      const options = await optionsRes.json();

      const attResp = await startRegistration(options);

      const verifyRes = await fetch("/api/passkey/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: attResp, nickname: nickname.trim() || undefined }),
      });
      if (!verifyRes.ok) throw new Error((await verifyRes.json()).error ?? "Verification failed");

      toast.success("Passkey enrolled");
      setNickname("");
      const refreshed = await fetch("/api/passkey", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null));
      if (refreshed) setPasskeys(refreshed);
      else location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enrollment failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (passkeys.length === 1 && !confirm("This is your only passkey. Removing it re-enables password login. Continue?")) return;
    if (!confirm("Remove this passkey? You'll need to enroll it again to use it.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/passkey/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setPasskeys((prev) => prev.filter((p) => p.id !== id));
      toast.success("Passkey removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {passkeys.length > 0 && (
        <ul className="flex flex-col gap-2">
          {passkeys.map((p) => (
            <li key={p.id} className="rounded-md border p-3 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{p.nickname || "Unnamed passkey"}</span>
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  <Badge variant="secondary">{p.deviceType === "multiDevice" ? "Synced" : "Device-bound"}</Badge>
                  {p.backedUp && <Badge variant="success">Backed up</Badge>}
                  <span>Added {new Date(p.createdAt).toLocaleDateString()}</span>
                  {p.lastUsedAt && <span>· Last used {new Date(p.lastUsedAt).toLocaleDateString()}</span>}
                </div>
              </div>
              <Button type="button" variant="destructive" size="sm" onClick={() => remove(p.id)} disabled={busy}>
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={enroll} className="flex flex-col gap-2">
        <Label>Add a new passkey</Label>
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Label (e.g. iPhone, YubiKey)"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="flex-1 min-w-[12rem]"
            maxLength={80}
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Enrolling…" : "Enroll passkey"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Your browser will prompt for Touch ID, Windows Hello, or a security key. Once any passkey is enrolled, password sign-in is disabled.
        </p>
      </form>
    </div>
  );
}
