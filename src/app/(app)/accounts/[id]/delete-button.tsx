"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Archive } from "lucide-react";

export function DeleteAccountButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run(mode: "delete" | "archive") {
    const prompt =
      mode === "delete"
        ? `Delete account "${name}"? This permanently removes the account and ALL its trades and transactions.`
        : `Archive account "${name}"? It will be hidden but its history is preserved.`;
    if (!confirm(prompt)) return;
    setBusy(true);
    const url = mode === "archive" ? `/api/accounts/${id}?mode=archive` : `/api/accounts/${id}`;
    const res = await fetch(url, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast.error(mode === "archive" ? "Archive failed" : "Delete failed");
      return;
    }
    toast.success(mode === "archive" ? "Account archived" : "Account deleted");
    router.push("/accounts");
    router.refresh();
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Button variant="outline" className="w-fit" onClick={() => run("archive")} disabled={busy}>
        <Archive className="size-4" /> Archive account
      </Button>
      <Button variant="destructive" className="w-fit" onClick={() => run("delete")} disabled={busy}>
        <Trash2 className="size-4" /> Delete account
      </Button>
    </div>
  );
}
