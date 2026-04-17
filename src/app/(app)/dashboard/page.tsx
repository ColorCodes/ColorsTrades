import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { summarizeAccount, aggregateFunded } from "@/lib/propfirm";
import { buildIncomeExpenseSeries, bucketForRange, rangeToDates } from "@/lib/propFlow";
import { computeKpis, equityCurve, toTradeLike } from "@/lib/analytics";
import { PropFlowChart } from "@/components/charts/prop-flow-chart";
import { EquityCurveChart } from "@/components/charts/equity-curve";
import { PnlCalendar } from "@/components/charts/pnl-calendar";
import { RangeTabs } from "./range-tabs";

type Range = "1M" | "3M" | "6M" | "YTD" | "1Y" | "ALL";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const range = (["1M", "3M", "6M", "YTD", "1Y", "ALL"].includes(sp.range ?? "") ? (sp.range as Range) : "3M") as Range;
  const { from } = rangeToDates(range);

  const [accounts, trades, transactions] = await Promise.all([
    prisma.propFirmAccount.findMany({ where: { userId: user.id, archivedAt: null }, orderBy: { createdAt: "desc" } }),
    prisma.trade.findMany({
      where: { userId: user.id, ...(from ? { entryAt: { gte: from } } : {}) },
      orderBy: { entryAt: "desc" },
      include: { account: { select: { name: true } } },
    }),
    prisma.accountTransaction.findMany({
      where: { userId: user.id, ...(from ? { occurredAt: { gte: from } } : {}) },
    }),
  ]);

  const summaries = accounts.map((a) => summarizeAccount(a, trades, transactions));
  const totals = aggregateFunded(summaries);

  const flow = buildIncomeExpenseSeries(transactions, trades, {
    includeTradingPnl: true,
    bucket: bucketForRange(range),
  });

  const tradeLike = trades.map(toTradeLike);
  const kpis = computeKpis(tradeLike);
  const equity = equityCurve(tradeLike);

  const firstDayOfMonth = new Date();
  firstDayOfMonth.setDate(1);
  firstDayOfMonth.setHours(0, 0, 0, 0);
  const mtdTrades = trades.filter((t) => (t.exitAt ?? t.entryAt) >= firstDayOfMonth).map(toTradeLike);
  const mtd = computeKpis(mtdTrades);
  const mtdPayouts = transactions
    .filter((t) => t.type === "PAYOUT" && t.occurredAt >= firstDayOfMonth)
    .reduce((a, b) => a + Number(b.amount), 0);
  const mtdFees = transactions
    .filter((t) => (t.type === "FEE" || t.type === "SUBSCRIPTION" || t.type === "RESET") && t.occurredAt >= firstDayOfMonth)
    .reduce((a, b) => a + Number(b.amount), 0);

  const recentTrades = trades.slice(0, 5);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Hero KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total funded accounts</CardDescription>
            <CardTitle className="text-3xl sm:text-4xl font-bold">{totals.fundedCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-xl font-semibold">{formatCurrency(totals.totalFundedBalance)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {totals.evalCount > 0 ? `${totals.evalCount} evaluation${totals.evalCount === 1 ? "" : "s"} in progress` : "No evaluations in progress"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total available drawdown</CardDescription>
            <CardTitle className="text-3xl sm:text-4xl font-bold">{formatCurrency(totals.totalAvailableDrawdown)}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {summaries
              .filter((s) => s.phase === "FUNDED" && s.maxTotalLoss != null)
              .slice(0, 4)
              .map((s) => {
                const pctUsed = s.drawdownPct ?? 0;
                const color = pctUsed < 0.5 ? "bg-success" : pctUsed < 0.8 ? "bg-warning" : "bg-destructive";
                return (
                  <div key={s.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate max-w-[60%]">{s.name}</span>
                      <span className="text-muted-foreground">
                        {formatCurrency(s.drawdownRemaining ?? 0)} left
                      </span>
                    </div>
                    <Progress value={pctUsed * 100} indicatorClassName={color} />
                  </div>
                );
              })}
            {summaries.filter((s) => s.phase === "FUNDED").length === 0 && (
              <div className="text-sm text-muted-foreground">
                No funded accounts yet. <Link href="/accounts/new" className="text-primary underline">Add one</Link>.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Prop flow chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle>Prop P&L flow</CardTitle>
              <CardDescription>Income (payouts + wins) vs expenses (fees + losses)</CardDescription>
            </div>
            <RangeTabs current={range} />
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <PropFlowChart data={flow} />
        </CardContent>
      </Card>

      {/* Secondary KPI strip */}
      <section className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Net P&L (MTD)" value={formatCurrency(mtd.totalNet)} tone={mtd.totalNet >= 0 ? "pos" : "neg"} />
        <Kpi label="Win rate" value={formatPercent(kpis.winRate)} />
        <Kpi label="Profit factor" value={kpis.profitFactor === Infinity ? "∞" : kpis.profitFactor.toFixed(2)} />
        <Kpi label="Avg win / loss" value={`${formatCurrency(kpis.avgWin)} / ${formatCurrency(-kpis.avgLoss)}`} />
        <Kpi label="Payouts (MTD)" value={formatCurrency(mtdPayouts)} tone="pos" />
        <Kpi label="Fees (MTD)" value={formatCurrency(mtdFees)} tone="neg" />
      </section>

      {/* Equity + calendar */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Equity curve</CardTitle>
            <CardDescription>Cumulative net P&L from closed trades</CardDescription>
          </CardHeader>
          <CardContent><EquityCurveChart data={equity} /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Daily P&L</CardTitle>
            <CardDescription>Last 90 days</CardDescription>
          </CardHeader>
          <CardContent><PnlCalendar trades={tradeLike} /></CardContent>
        </Card>
      </section>

      {/* Recent trades */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle>Recent trades</CardTitle>
          <Button asChild variant="outline" size="sm"><Link href="/trades">View all</Link></Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentTrades.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No trades yet.</div>
          ) : (
            <ul className="divide-y">
              {recentTrades.map((t) => {
                const net = Number(t.netPnl ?? 0);
                return (
                  <li key={t.id}>
                    <Link href={`/trades/${t.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{t.symbol}</span>
                          <Badge variant={t.side === "LONG" ? "default" : "secondary"} className="text-[10px]">{t.side}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground truncate">{t.account.name} · {new Date(t.entryAt).toLocaleDateString()}</span>
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
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  const colorClass = tone === "pos" ? "text-success" : tone === "neg" ? "text-destructive" : "";
  return (
    <div className="shrink-0 min-w-[140px] rounded-lg border bg-card p-3 sm:p-4 sm:min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg sm:text-xl font-semibold ${colorClass}`}>{value}</div>
    </div>
  );
}
