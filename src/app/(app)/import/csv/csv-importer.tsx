"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const FIELDS = [
  { key: "symbol", label: "Symbol", required: true },
  { key: "side", label: "Side (LONG/SHORT/BUY/SELL)", required: true },
  { key: "quantity", label: "Quantity", required: true },
  { key: "entryPrice", label: "Entry price", required: true },
  { key: "entryAt", label: "Entry time", required: true },
  { key: "exitPrice", label: "Exit price", required: false },
  { key: "exitAt", label: "Exit time", required: false },
  { key: "fees", label: "Fees", required: false },
  { key: "stopLoss", label: "Stop loss", required: false },
  { key: "takeProfit", label: "Take profit", required: false },
  { key: "notes", label: "Notes", required: false },
  { key: "instrumentType", label: "Instrument type", required: false },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];
type Mapping = Partial<Record<FieldKey, string>>;

export function CsvImporter({ accounts }: { accounts: { id: string; name: string }[] }) {
  const router = useRouter();
  const [accountId, setAccountId] = React.useState(accounts[0]?.id ?? "");
  const [rows, setRows] = React.useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [mapping, setMapping] = React.useState<Mapping>({});
  const [submitting, setSubmitting] = React.useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsedRows = result.data.filter((r) => Object.values(r).some((v) => v && v !== ""));
        setRows(parsedRows);
        setHeaders(result.meta.fields ?? Object.keys(parsedRows[0] ?? {}));
        const auto: Mapping = {};
        for (const f of FIELDS) {
          const match = (result.meta.fields ?? []).find((h) => h && normalize(h).includes(normalize(f.key)));
          if (match) auto[f.key] = match;
        }
        setMapping(auto);
      },
      error: () => toast.error("Failed to parse CSV"),
    });
  }

  const missingRequired = FIELDS.filter((f) => f.required && !mapping[f.key]).map((f) => f.label);

  async function submit() {
    if (!accountId) {
      toast.error("Pick an account");
      return;
    }
    if (missingRequired.length > 0) {
      toast.error(`Map required fields: ${missingRequired.join(", ")}`);
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/import/csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, mapping, rows }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Import failed" }));
      toast.error(error ?? "Import failed");
      return;
    }
    const { created } = await res.json();
    toast.success(`Imported ${created} trade${created === 1 ? "" : "s"}`);
    router.push("/trades");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card><CardContent className="p-4 sm:p-6 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Account</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger><SelectValue placeholder="Choose account" /></SelectTrigger>
            <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>CSV file</Label>
          <Input type="file" accept=".csv,text/csv" onChange={handleFile} />
        </div>
      </CardContent></Card>

      {headers.length > 0 && (
        <>
          <Card><CardContent className="p-4 sm:p-6">
            <h3 className="font-semibold mb-2">Map columns</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FIELDS.map((f) => (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <Label className="flex items-center gap-2">{f.label} {f.required && <Badge variant="outline" className="text-[10px]">required</Badge>}</Label>
                  <Select value={mapping[f.key] ?? "__none"} onValueChange={(v) => setMapping((prev) => ({ ...prev, [f.key]: v === "__none" ? undefined : v }))}>
                    <SelectTrigger><SelectValue placeholder="(none)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">(none)</SelectItem>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent></Card>

          <Card><CardContent className="p-0">
            <div className="p-4 pb-2 text-sm text-muted-foreground">Preview — first 10 of {rows.length} rows</div>
            <Table>
              <TableHeader><TableRow>{headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {rows.slice(0, 10).map((r, i) => (
                  <TableRow key={i}>{headers.map((h) => <TableCell key={h} className="text-xs">{r[h] ?? ""}</TableCell>)}</TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>

          <div className="flex gap-2">
            <Button onClick={submit} disabled={submitting || missingRequired.length > 0}>{submitting ? "Importing…" : `Import ${rows.length} trades`}</Button>
            <Button variant="outline" onClick={() => { setRows([]); setHeaders([]); setMapping({}); }}>Reset</Button>
          </div>
        </>
      )}
    </div>
  );
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}
