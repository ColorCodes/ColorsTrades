"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function NewTransactionForm({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<"DEPOSIT" | "WITHDRAWAL" | "PAYOUT" | "FEE" | "SUBSCRIPTION" | "RESET" | "OTHER">("PAYOUT");
  const [amount, setAmount] = React.useState("");
  const [occurredAt, setOccurredAt] = React.useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch(`/api/accounts/${accountId}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, amount: Number(amount), occurredAt, memo }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Save failed" }));
      toast.error(error ?? "Save failed");
      return;
    }
    toast.success("Transaction saved");
    setOpen(false);
    setAmount("");
    setMemo("");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="size-4" /> New</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New transaction</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PAYOUT">Payout</SelectItem>
                <SelectItem value="FEE">Fee</SelectItem>
                <SelectItem value="SUBSCRIPTION">Subscription</SelectItem>
                <SelectItem value="RESET">Reset</SelectItem>
                <SelectItem value="DEPOSIT">Deposit</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Amount</Label>
            <Input type="number" step="any" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Date</Label>
            <Input type="date" required value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Memo</Label>
            <Textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
