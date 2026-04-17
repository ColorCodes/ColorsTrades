"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ParsedTrade {
  symbol: string;
  side: "LONG" | "SHORT";
  quantity: number;
  entryPrice: number;
  exitPrice?: number | null;
  entryAt: string;
  exitAt?: string | null;
  fees?: number | null;
  instrumentType?: "FUTURES" | "STOCK" | "FX" | "CRYPTO" | "OPTION";
  notes?: string | null;
}

export function ChatImporter({ accounts, enabled }: { accounts: { id: string; name: string }[]; enabled: boolean }) {
  const router = useRouter();
  const [accountId, setAccountId] = React.useState(accounts[0]?.id ?? "");
  const [input, setInput] = React.useState("");
  const [parsed, setParsed] = React.useState<ParsedTrade[]>([]);
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function parse() {
    if (!input.trim()) return;
    setBusy(true);
    const res = await fetch("/api/import/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input }),
    });
    setBusy(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Parse failed" }));
      toast.error(error ?? "Parse failed");
      return;
    }
    const { trades, sessionId: sid } = await res.json();
    setParsed(trades);
    setSessionId(sid);
    if (!trades || trades.length === 0) toast.message("No trades detected");
  }

  async function confirm() {
    if (!sessionId || parsed.length === 0 || !accountId) return;
    setBusy(true);
    const res = await fetch("/api/import/llm/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, accountId, trades: parsed }),
    });
    setBusy(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Save failed" }));
      toast.error(error ?? "Save failed");
      return;
    }
    const { created } = await res.json();
    toast.success(`Saved ${created} trade${created === 1 ? "" : "s"}`);
    router.push("/trades");
    router.refresh();
  }

  function updateField<K extends keyof ParsedTrade>(idx: number, key: K, value: ParsedTrade[K]) {
    setParsed((prev) => prev.map((t, i) => (i === idx ? { ...t, [key]: value } : t)));
  }

  function remove(idx: number) {
    setParsed((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-4">
      <Card><CardContent className="p-4 sm:p-6 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Account</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger><SelectValue placeholder="Pick an account" /></SelectTrigger>
            <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Paste trades</Label>
          <Textarea
            rows={10}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Examples you can paste:\n\n"Yesterday I bought 2 ES at 5120.25 and sold at 5128.50, fees ~$4"\n\nor a broker statement, or raw text copy/pasted from your trading platform.`}
            disabled={!enabled}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={parse} disabled={!enabled || busy || !input.trim()}>{busy ? "Thinking…" : "Parse with AI"}</Button>
          <Button variant="outline" onClick={() => { setInput(""); setParsed([]); setSessionId(null); }}>Clear</Button>
        </div>
      </CardContent></Card>

      {parsed.length > 0 && (
        <Card><CardContent className="p-0">
          <div className="p-4 pb-2 font-semibold">Review {parsed.length} trade{parsed.length === 1 ? "" : "s"}</div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Exit</TableHead>
                  <TableHead>Entry at</TableHead>
                  <TableHead>Exit at</TableHead>
                  <TableHead>Fees</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsed.map((t, i) => (
                  <TableRow key={i}>
                    <TableCell><Input value={t.symbol} onChange={(e) => updateField(i, "symbol", e.target.value.toUpperCase())} className="w-24" /></TableCell>
                    <TableCell>
                      <Select value={t.side} onValueChange={(v) => updateField(i, "side", v as "LONG" | "SHORT")}>
                        <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="LONG">LONG</SelectItem><SelectItem value="SHORT">SHORT</SelectItem></SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Input type="number" step="any" inputMode="decimal" value={t.quantity} onChange={(e) => updateField(i, "quantity", Number(e.target.value))} className="w-20" /></TableCell>
                    <TableCell><Input type="number" step="any" inputMode="decimal" value={t.entryPrice} onChange={(e) => updateField(i, "entryPrice", Number(e.target.value))} className="w-24" /></TableCell>
                    <TableCell><Input type="number" step="any" inputMode="decimal" value={t.exitPrice ?? ""} onChange={(e) => updateField(i, "exitPrice", e.target.value === "" ? null : Number(e.target.value))} className="w-24" /></TableCell>
                    <TableCell><Input type="datetime-local" value={toLocal(t.entryAt)} onChange={(e) => updateField(i, "entryAt", e.target.value)} className="w-48" /></TableCell>
                    <TableCell><Input type="datetime-local" value={t.exitAt ? toLocal(t.exitAt) : ""} onChange={(e) => updateField(i, "exitAt", e.target.value || null)} className="w-48" /></TableCell>
                    <TableCell><Input type="number" step="any" inputMode="decimal" value={t.fees ?? ""} onChange={(e) => updateField(i, "fees", e.target.value === "" ? null : Number(e.target.value))} className="w-20" /></TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => remove(i)}>Remove</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 flex items-center justify-between gap-2">
            <Badge variant="outline">Session: {sessionId?.slice(0, 8)}…</Badge>
            <Button onClick={confirm} disabled={busy || parsed.length === 0}>{busy ? "Saving…" : `Save ${parsed.length} trade${parsed.length === 1 ? "" : "s"}`}</Button>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}

function toLocal(iso: string): string {
  try {
    const d = new Date(iso);
    const tz = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tz).toISOString().slice(0, 16);
  } catch {
    return "";
  }
}
