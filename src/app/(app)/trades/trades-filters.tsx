"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function TradesFilters({
  accounts,
  initial,
}: {
  accounts: { id: string; name: string }[];
  initial: { accountId?: string; symbol?: string; side?: string; from?: string; to?: string };
}) {
  const router = useRouter();
  const [accountId, setAccountId] = React.useState(initial.accountId ?? "all");
  const [symbol, setSymbol] = React.useState(initial.symbol ?? "");
  const [side, setSide] = React.useState(initial.side ?? "all");
  const [from, setFrom] = React.useState(initial.from ?? "");
  const [to, setTo] = React.useState(initial.to ?? "");

  function apply() {
    const params = new URLSearchParams();
    if (accountId && accountId !== "all") params.set("accountId", accountId);
    if (symbol) params.set("symbol", symbol.trim().toUpperCase());
    if (side && side !== "all") params.set("side", side);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/trades?${params.toString()}`);
  }

  function reset() {
    setAccountId("all"); setSymbol(""); setSide("all"); setFrom(""); setTo("");
    router.push("/trades");
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
      <Select value={accountId} onValueChange={setAccountId}>
        <SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All accounts</SelectItem>
          {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input placeholder="Symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
      <Select value={side} onValueChange={setSide}>
        <SelectTrigger><SelectValue placeholder="Side" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sides</SelectItem>
          <SelectItem value="LONG">Long</SelectItem>
          <SelectItem value="SHORT">Short</SelectItem>
        </SelectContent>
      </Select>
      <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      <div className="col-span-2 sm:col-span-5 flex gap-2">
        <Button size="sm" onClick={apply}>Apply</Button>
        <Button size="sm" variant="outline" onClick={reset}>Reset</Button>
      </div>
    </div>
  );
}
