import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { summarizeAccount } from "@/lib/propfirm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { AccountForm } from "../account-form";
import { NewTransactionForm } from "./new-transaction-form";
import { DeleteAccountButton } from "./delete-button";

export default async function AccountDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const account = await prisma.propFirmAccount.findFirst({ where: { id, userId: user.id } });
  if (!account) notFound();

  const [trades, transactions] = await Promise.all([
    prisma.trade.findMany({ where: { userId: user.id, accountId: id }, orderBy: { entryAt: "desc" }, take: 50 }),
    prisma.accountTransaction.findMany({ where: { userId: user.id, accountId: id }, orderBy: { occurredAt: "desc" } }),
  ]);
  const allTrades = await prisma.trade.findMany({ where: { userId: user.id, accountId: id } });
  const summary = summarizeAccount(account, allTrades, transactions);
  const pctUsed = summary.drawdownPct ?? 0;
  const color = pctUsed < 0.5 ? "bg-success" : pctUsed < 0.8 ? "bg-warning" : "bg-destructive";

  return (
    <div className="flex flex-col gap-4 max-w-4xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">{account.name}</h1>
          <p className="text-sm text-muted-foreground">{account.firm ?? "—"} {account.accountNumber ? `· ${account.accountNumber}` : ""}</p>
        </div>
        <Button asChild variant="outline" size="sm"><Link href="/accounts">Back</Link></Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Balance</CardDescription><CardTitle className="text-2xl">{formatCurrency(summary.currentBalance)}</CardTitle></CardHeader>
          <CardContent><Badge variant={summary.phase === "FUNDED" ? "success" : "secondary"}>{summary.phase}</Badge></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Net income (payouts − fees + trading)</CardDescription><CardTitle className={`text-2xl ${summary.netIncome >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(summary.netIncome)}</CardTitle></CardHeader>
          <CardContent className="text-xs text-muted-foreground">Payouts {formatCurrency(summary.payouts)} · Fees {formatCurrency(summary.fees)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Drawdown</CardDescription>
            <CardTitle className="text-2xl">{summary.maxTotalLoss != null ? formatCurrency(summary.drawdownRemaining ?? 0) : "—"}</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.maxTotalLoss != null ? (
              <div className="flex flex-col gap-1">
                <Progress value={pctUsed * 100} indicatorClassName={color} />
                <div className="text-xs text-muted-foreground">Used {formatCurrency(summary.drawdownUsed)} of {formatCurrency(summary.maxTotalLoss)}</div>
              </div>
            ) : <div className="text-xs text-muted-foreground">No max drawdown set</div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle>Transactions</CardTitle>
          <NewTransactionForm accountId={account.id} />
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No transactions yet.</div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Memo</TableHead></TableRow></TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                  const isIncome = tx.type === "PAYOUT" || tx.type === "DEPOSIT";
                  const amt = Number(tx.amount);
                  return (
                    <TableRow key={tx.id}>
                      <TableCell>{new Date(tx.occurredAt).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant={isIncome ? "success" : "secondary"}>{tx.type}</Badge></TableCell>
                      <TableCell className={`text-right font-medium ${isIncome ? "text-success" : "text-destructive"}`}>{isIncome ? "+" : "-"}{formatCurrency(amt)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{tx.memo}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle>Recent trades</CardTitle></CardHeader>
        <CardContent className="p-0">
          {trades.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No trades for this account.</div>
          ) : (
            <ul className="divide-y">
              {trades.slice(0, 10).map((t) => {
                const net = Number(t.netPnl ?? 0);
                return (
                  <li key={t.id}>
                    <Link href={`/trades/${t.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{t.symbol}</span>
                          <Badge variant={t.side === "LONG" ? "default" : "secondary"} className="text-[10px]">{t.side}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(t.entryAt).toLocaleDateString()}</span>
                      </div>
                      <span className={net >= 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>{formatCurrency(net)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle>Edit account</CardTitle></CardHeader>
        <CardContent>
          <AccountForm
            id={account.id}
            initial={{
              name: account.name,
              firm: account.firm ?? "",
              accountNumber: account.accountNumber ?? "",
              phase: account.phase,
              startingBalance: Number(account.startingBalance),
              currentBalance: Number(account.currentBalance),
              profitTarget: account.profitTarget != null ? Number(account.profitTarget) : "",
              maxDailyLoss: account.maxDailyLoss != null ? Number(account.maxDailyLoss) : "",
              maxTotalLoss: account.maxTotalLoss != null ? Number(account.maxTotalLoss) : "",
              payoutSplit: account.payoutSplit != null ? Number(account.payoutSplit) : "",
              currency: account.currency,
            }}
          />
        </CardContent>
      </Card>

      <DeleteAccountButton id={account.id} name={account.name} />
    </div>
  );
}
