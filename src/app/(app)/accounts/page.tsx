import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { summarizeAccount } from "@/lib/propfirm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";

const PHASE_LABEL: Record<string, string> = {
  EVAL_1: "Eval 1",
  EVAL_2: "Eval 2",
  FUNDED: "Funded",
  BREACHED: "Breached",
  ARCHIVED: "Archived",
};

export default async function AccountsPage() {
  const user = await requireUser();
  const [accounts, trades, transactions] = await Promise.all([
    prisma.propFirmAccount.findMany({ where: { userId: user.id, archivedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.trade.findMany({ where: { userId: user.id } }),
    prisma.accountTransaction.findMany({ where: { userId: user.id } }),
  ]);
  const summaries = accounts.map((a) => summarizeAccount(a, trades, transactions));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Accounts</h1>
          <p className="text-sm text-muted-foreground">{summaries.length} active</p>
        </div>
        <Button asChild><Link href="/accounts/new"><Plus className="size-4" /> New</Link></Button>
      </div>

      {summaries.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No accounts yet. <Link href="/accounts/new" className="text-primary underline">Create one</Link>.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {summaries.map((s) => {
            const pctUsed = s.drawdownPct ?? 0;
            const color = pctUsed < 0.5 ? "bg-success" : pctUsed < 0.8 ? "bg-warning" : "bg-destructive";
            return (
              <Link key={s.id} href={`/accounts/${s.id}`}>
                <Card className="h-full hover:bg-accent transition-colors">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="truncate">{s.name}</CardTitle>
                        <CardDescription className="truncate">{s.firm ?? "—"}</CardDescription>
                      </div>
                      <Badge variant={s.phase === "FUNDED" ? "success" : s.phase === "BREACHED" ? "destructive" : "secondary"}>{PHASE_LABEL[s.phase] ?? s.phase}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-muted-foreground">Balance</span>
                      <span className="text-lg font-semibold">{formatCurrency(s.currentBalance)}</span>
                    </div>
                    {s.maxTotalLoss != null && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Drawdown used</span>
                          <span>{formatCurrency(s.drawdownUsed)} / {formatCurrency(s.maxTotalLoss)}</span>
                        </div>
                        <Progress value={pctUsed * 100} indicatorClassName={color} />
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><div className="text-muted-foreground">Payouts</div><div className="font-medium text-success">{formatCurrency(s.payouts)}</div></div>
                      <div><div className="text-muted-foreground">Fees</div><div className="font-medium text-destructive">{formatCurrency(s.fees)}</div></div>
                      <div><div className="text-muted-foreground">Net</div><div className={`font-medium ${s.netIncome >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(s.netIncome)}</div></div>
                    </div>
                    {s.profitTarget != null && (
                      <div className="text-xs text-muted-foreground">
                        Target: {formatCurrency(s.profitTarget)} ({formatPercent((s.currentBalance - s.startingBalance) / s.profitTarget)})
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
