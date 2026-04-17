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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const formSchema = z.object({
  accountId: z.string().min(1, "Required"),
  symbol: z.string().min(1, "Required"),
  instrumentType: z.enum(["STOCK", "FUTURES", "FX", "CRYPTO", "OPTION"]),
  side: z.enum(["LONG", "SHORT"]),
  quantity: z.coerce.number().positive(),
  entryPrice: z.coerce.number(),
  exitPrice: z.union([z.coerce.number(), z.literal("")]).optional(),
  entryAt: z.string().min(1),
  exitAt: z.string().optional().default(""),
  fees: z.union([z.coerce.number(), z.literal("")]).optional(),
  stopLoss: z.union([z.coerce.number(), z.literal("")]).optional(),
  takeProfit: z.union([z.coerce.number(), z.literal("")]).optional(),
  tags: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

type FormValues = z.input<typeof formSchema>;

export interface TradeFormValues {
  accountId: string;
  symbol: string;
  instrumentType: "STOCK" | "FUTURES" | "FX" | "CRYPTO" | "OPTION";
  side: "LONG" | "SHORT";
  quantity: number | string;
  entryPrice: number | string;
  exitPrice?: number | string | null;
  entryAt: string;
  exitAt?: string | null;
  fees?: number | string | null;
  stopLoss?: number | string | null;
  takeProfit?: number | string | null;
  tags?: string[];
  notes?: string | null;
}

export function TradeForm({
  accounts,
  initial,
  id,
}: {
  accounts: { id: string; name: string }[];
  initial?: Partial<TradeFormValues>;
  id?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const defaults: FormValues = {
    accountId: initial?.accountId ?? accounts[0]?.id ?? "",
    symbol: initial?.symbol ?? "",
    instrumentType: (initial?.instrumentType as FormValues["instrumentType"]) ?? "FUTURES",
    side: (initial?.side as FormValues["side"]) ?? "LONG",
    quantity: (initial?.quantity as FormValues["quantity"]) ?? 1,
    entryPrice: (initial?.entryPrice as FormValues["entryPrice"]) ?? 0,
    exitPrice: (initial?.exitPrice as FormValues["exitPrice"]) ?? "",
    entryAt: initial?.entryAt?.slice(0, 16) ?? new Date().toISOString().slice(0, 16),
    exitAt: initial?.exitAt?.slice(0, 16) ?? "",
    fees: (initial?.fees as FormValues["fees"]) ?? "",
    stopLoss: (initial?.stopLoss as FormValues["stopLoss"]) ?? "",
    takeProfit: (initial?.takeProfit as FormValues["takeProfit"]) ?? "",
    tags: (initial?.tags ?? []).join(","),
    notes: initial?.notes ?? "",
  };

  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaults });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const payload = {
      accountId: values.accountId,
      symbol: values.symbol,
      instrumentType: values.instrumentType,
      side: values.side,
      quantity: values.quantity,
      entryPrice: values.entryPrice,
      exitPrice: values.exitPrice === "" ? null : values.exitPrice,
      entryAt: new Date(values.entryAt as string).toISOString(),
      exitAt: values.exitAt ? new Date(values.exitAt as string).toISOString() : null,
      fees: values.fees === "" ? 0 : values.fees,
      stopLoss: values.stopLoss === "" ? null : values.stopLoss,
      takeProfit: values.takeProfit === "" ? null : values.takeProfit,
      tags: (values.tags ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      notes: values.notes ?? null,
    };
    const res = await fetch(id ? `/api/trades/${id}` : "/api/trades", {
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
    toast.success(id ? "Trade updated" : "Trade created");
    router.push("/trades");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Account" error={form.formState.errors.accountId?.message}>
            <Select value={form.watch("accountId")} onValueChange={(v) => form.setValue("accountId", v, { shouldValidate: true })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Symbol" error={form.formState.errors.symbol?.message}>
            <Input {...form.register("symbol")} autoCapitalize="characters" />
          </Field>
          <Field label="Instrument">
            <Select value={form.watch("instrumentType")} onValueChange={(v) => form.setValue("instrumentType", v as FormValues["instrumentType"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FUTURES">Futures</SelectItem>
                <SelectItem value="STOCK">Stock</SelectItem>
                <SelectItem value="OPTION">Option</SelectItem>
                <SelectItem value="FX">FX</SelectItem>
                <SelectItem value="CRYPTO">Crypto</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Side">
            <Select value={form.watch("side")} onValueChange={(v) => form.setValue("side", v as FormValues["side"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="LONG">Long</SelectItem>
                <SelectItem value="SHORT">Short</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Quantity" error={form.formState.errors.quantity?.message}>
            <Input type="number" step="any" inputMode="decimal" {...form.register("quantity")} />
          </Field>
          <Field label="Entry price" error={form.formState.errors.entryPrice?.message}>
            <Input type="number" step="any" inputMode="decimal" {...form.register("entryPrice")} />
          </Field>
          <Field label="Exit price">
            <Input type="number" step="any" inputMode="decimal" {...form.register("exitPrice")} />
          </Field>
          <Field label="Fees">
            <Input type="number" step="any" inputMode="decimal" {...form.register("fees")} />
          </Field>
          <Field label="Entry at">
            <Input type="datetime-local" {...form.register("entryAt")} />
          </Field>
          <Field label="Exit at">
            <Input type="datetime-local" {...form.register("exitAt")} />
          </Field>
          <Field label="Stop loss">
            <Input type="number" step="any" inputMode="decimal" {...form.register("stopLoss")} />
          </Field>
          <Field label="Take profit">
            <Input type="number" step="any" inputMode="decimal" {...form.register("takeProfit")} />
          </Field>
          <Field label="Tags (comma separated)" className="sm:col-span-2">
            <Input {...form.register("tags")} placeholder="breakout, news" />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea rows={4} {...form.register("notes")} />
          </Field>
          <div className="sm:col-span-2 flex flex-col sm:flex-row gap-2 pt-2">
            <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : id ? "Update trade" : "Create trade"}</Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
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
