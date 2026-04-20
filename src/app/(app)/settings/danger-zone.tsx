"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export function DangerZone() {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "trades" | "all">(null);

  async function wipe(scope: "trades" | "all") {
    const message =
      scope === "trades"
        ? "Delete ALL trades for this account? This cannot be undone."
        : "Delete ALL accounts, trades, transactions, and journal entries? This cannot be undone.";
    if (!confirm(message)) return;
    if (!confirm("Are you absolutely sure? Type-check is bypassed — this is permanent.")) return;
    setBusy(scope);
    const res = await fetch("/api/settings/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scope }),
    });
    setBusy(null);
    if (!res.ok) {
      toast.error("Reset failed");
      return;
    }
    const data = await res.json().catch(() => null);
    const d = data?.deleted;
    toast.success(
      d
        ? `Deleted ${d.trades} trades, ${d.transactions} txns, ${d.accounts} accounts, ${d.journal} entries`
        : "Reset complete"
    );
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" className="w-fit" onClick={() => wipe("trades")} disabled={busy !== null}>
        <Trash2 className="size-4" /> {busy === "trades" ? "Deleting…" : "Delete all trades"}
      </Button>
      <Button variant="destructive" className="w-fit" onClick={() => wipe("all")} disabled={busy !== null}>
        <Trash2 className="size-4" /> {busy === "all" ? "Deleting…" : "Delete ALL data"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Removes seeded demo data. Your login stays — you&apos;ll start with an empty journal.
      </p>
    </div>
  );
}
