"use client";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) { toast.error("New password must be ≥ 8 chars"); return; }
    setBusy(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next }),
    });
    setBusy(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed" }));
      toast.error(error ?? "Failed");
      return;
    }
    toast.success("Password updated");
    setCurrent(""); setNext("");
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 max-w-sm">
      <div className="flex flex-col gap-1.5">
        <Label>Current password</Label>
        <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>New password</Label>
        <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
      </div>
      <Button type="submit" disabled={busy} className="w-fit">{busy ? "Updating…" : "Update password"}</Button>
    </form>
  );
}
