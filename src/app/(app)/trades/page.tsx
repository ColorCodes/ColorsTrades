import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Plus } from "lucide-react";
import { TradesFilters } from "./trades-filters";

type SearchParams = { accountId?: string; symbol?: string; side?: string; from?: string; to?: string };

export default async function TradesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireUser();
  const sp = await searchParams;

  const accounts = await prisma.propFirmAccount.findMany({
    where: { userId: user.id, archivedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const trades = await prisma.trade.findMany({
    where: {
      userId: user.id,
      ...(sp.accountId ? { accountId: sp.accountId } : {}),
      ...(sp.symbol ? { symbol: sp.symbol.toUpperCase() } : {}),
      ...(sp.side === "LONG" || sp.side === "SHORT" ? { side: sp.side } : {}),
      ...(sp.from || sp.to
        ? {
            entryAt: {
              ...(sp.from ? { gte: new Date(sp.from) } : {}),
              ...(sp.to ? { lte: new Date(sp.to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { entryAt: "desc" },
    take: 200,
    include: { account: { select: { name: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Trades</h1>
          <p className="text-sm text-muted-foreground">{trades.length} recent</p>
        </div>
        <Button asChild><Link href="/trades/new"><Plus className="size-4" /> New</Link></Button>
      </div>

      <TradesFilters accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} initial={sp} />

      {trades.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No trades yet</CardTitle>
            <CardDescription>Log your first trade or import from CSV.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-2">
            <Button asChild><Link href="/trades/new">Log a trade</Link></Button>
            <Button asChild variant="outline"><Link href="/import">Import</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile card list */}
          <div className="grid grid-cols-1 gap-2 sm:hidden">
            {trades.map((t) => {
              const net = Number(t.netPnl ?? 0);
              return (
                <Link href={`/trades/${t.id}`} key={t.id}>
                  <Card className="hover:bg-accent">
                    <CardContent className="p-3 flex items-center justify-between gap-3">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{t.symbol}</span>
                          <Badge variant={t.side === "LONG" ? "default" : "secondary"} className="text-[10px]">{t.side}</Badge>
                          <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{t.account.name} · {new Date(t.entryAt).toLocaleDateString()}</div>
                      </div>
                      <div className={net >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
                        {formatCurrency(net)}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Exit</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead className="text-right">Net P&L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((t) => {
                  const net = Number(t.netPnl ?? 0);
                  return (
                    <TableRow key={t.id} className="cursor-pointer" onClick={() => {}}>
                      <TableCell>
                        <Link href={`/trades/${t.id}`} className="block">
                          {new Date(t.entryAt).toLocaleDateString()}
                        </Link>
                      </TableCell>
                      <TableCell><Link href={`/trades/${t.id}`} className="font-medium">{t.symbol}</Link></TableCell>
                      <TableCell><Badge variant={t.side === "LONG" ? "default" : "secondary"}>{t.side}</Badge></TableCell>
                      <TableCell>{String(t.quantity)}</TableCell>
                      <TableCell>{String(t.entryPrice)}</TableCell>
                      <TableCell>{t.exitPrice != null ? String(t.exitPrice) : "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{t.account.name}</TableCell>
                      <TableCell className={`text-right font-medium ${net >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatCurrency(net)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
