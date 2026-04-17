"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const schema = z.object({
  name: z.string().min(1),
  firm: z.string().optional().default(""),
  accountNumber: z.string().optional().default(""),
  phase: z.enum(["EVAL_1", "EVAL_2", "FUNDED", "BREACHED", "ARCHIVED"]),
  startingBalance: z.coerce.number(),
  currentBalance: z.union([z.coerce.number(), z.literal("")]).optional(),
  profitTarget: z.union([z.coerce.number(), z.literal("")]).optional(),
  maxDailyLoss: z.union([z.coerce.number(), z.literal("")]).optional(),
  maxTotalLoss: z.union([z.coerce.number(), z.literal("")]).optional(),
  payoutSplit: z.union([z.coerce.number(), z.literal("")]).optional(),
  currency: z.string().default("USD"),
});

type Values = z.input<typeof schema>;

export interface AccountInitial extends Partial<Values> {}

export function AccountForm({ id, initial }: { id?: string; initial?: AccountInitial }) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      firm: initial?.firm ?? "",
      accountNumber: initial?.accountNumber ?? "",
      phase: (initial?.phase as Values["phase"]) ?? "EVAL_1",
      startingBalance: (initial?.startingBalance as Values["startingBalance"]) ?? 50000,
      currentBalance: (initial?.currentBalance as Values["currentBalance"]) ?? "",
      profitTarget: (initial?.profitTarget as Values["profitTarget"]) ?? "",
      maxDailyLoss: (initial?.maxDailyLoss as Values["maxDailyLoss"]) ?? "",
      maxTotalLoss: (initial?.maxTotalLoss as Values["maxTotalLoss"]) ?? "",
      payoutSplit: (initial?.payoutSplit as Values["payoutSplit"]) ?? "",
      currency: initial?.currency ?? "USD",
    },
  });

  async function onSubmit(values: Values) {
    setSubmitting(true);
    const payload = {
      name: values.name,
      firm: values.firm || null,
      accountNumber: values.accountNumber || null,
      phase: values.phase,
      startingBalance: values.startingBalance,
      currentBalance: values.currentBalance === "" ? undefined : values.currentBalance,
      profitTarget: values.profitTarget === "" ? null : values.profitTarget,
      maxDailyLoss: values.maxDailyLoss === "" ? null : values.maxDailyLoss,
      maxTotalLoss: values.maxTotalLoss === "" ? null : values.maxTotalLoss,
      payoutSplit: values.payoutSplit === "" ? null : values.payoutSplit,
      currency: values.currency,
    };
    const res = await fetch(id ? `/api/accounts/${id}` : "/api/accounts", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Save failed" }));
      toast.error(error ?? "Save failed");
      return;
    }
    toast.success(id ? "Account updated" : "Account created");
    router.push("/accounts");
    router.refresh();
  }

  return (
    <Card><CardContent className="p-4 sm:p-6">
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Name" className="sm:col-span-2" error={form.formState.errors.name?.message}>
          <Input {...form.register("name")} placeholder="Apex 50K — Funded" />
        </Field>
        <Field label="Firm"><Input {...form.register("firm")} placeholder="Apex / TopStep / MFF" /></Field>
        <Field label="Account number"><Input {...form.register("accountNumber")} /></Field>
        <Field label="Phase">
          <Select value={form.watch("phase")} onValueChange={(v) => form.setValue("phase", v as Values["phase"])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="EVAL_1">Eval 1</SelectItem>
              <SelectItem value="EVAL_2">Eval 2</SelectItem>
              <SelectItem value="FUNDED">Funded</SelectItem>
              <SelectItem value="BREACHED">Breached</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Currency"><Input {...form.register("currency")} /></Field>
        <Field label="Starting balance" error={form.formState.errors.startingBalance?.message}>
          <Input type="number" step="any" inputMode="decimal" {...form.register("startingBalance")} />
        </Field>
        <Field label="Current balance"><Input type="number" step="any" inputMode="decimal" {...form.register("currentBalance")} /></Field>
        <Field label="Profit target"><Input type="number" step="any" inputMode="decimal" {...form.register("profitTarget")} /></Field>
        <Field label="Max daily loss"><Input type="number" step="any" inputMode="decimal" {...form.register("maxDailyLoss")} /></Field>
        <Field label="Max total drawdown"><Input type="number" step="any" inputMode="decimal" {...form.register("maxTotalLoss")} /></Field>
        <Field label="Payout split (0-1)"><Input type="number" step="any" inputMode="decimal" {...form.register("payoutSplit")} placeholder="0.9" /></Field>
        <div className="sm:col-span-2 flex gap-2 pt-2">
          <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : id ? "Update" : "Create"}</Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </CardContent></Card>
  );
}

function Field({ label, error, children, className }: { label: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}
