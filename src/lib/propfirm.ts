import type { AccountTransaction, PropFirmAccount, Trade } from "@prisma/client";

export interface AccountSummary {
  id: string;
  name: string;
  firm: string | null;
  phase: PropFirmAccount["phase"];
  startingBalance: number;
  currentBalance: number;
  maxTotalLoss: number | null;
  maxDailyLoss: number | null;
  profitTarget: number | null;
  tradingPnl: number;
  payouts: number;
  fees: number;
  netIncome: number;
  drawdownUsed: number;
  drawdownRemaining: number | null;
  drawdownPct: number | null;
  dailyPnl: number;
  dailyLossRemaining: number | null;
  currency: string;
}

function sumTrades(trades: Pick<Trade, "netPnl" | "status" | "accountId">[]): number {
  let s = 0;
  for (const t of trades) {
    if (t.status === "CLOSED" && t.netPnl != null) s += Number(t.netPnl);
  }
  return s;
}

function isToday(d: Date): boolean {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function summarizeAccount(
  account: PropFirmAccount,
  trades: Pick<Trade, "netPnl" | "status" | "accountId" | "exitAt" | "entryAt">[],
  transactions: Pick<AccountTransaction, "type" | "amount" | "accountId">[],
): AccountSummary {
  const accTrades = trades.filter((t) => t.accountId === account.id);
  const accTx = transactions.filter((t) => t.accountId === account.id);
  const tradingPnl = sumTrades(accTrades);
  const payouts = accTx.filter((t) => t.type === "PAYOUT").reduce((a, b) => a + Number(b.amount), 0);
  const fees = accTx
    .filter((t) => t.type === "FEE" || t.type === "SUBSCRIPTION" || t.type === "RESET")
    .reduce((a, b) => a + Number(b.amount), 0);

  const starting = Number(account.startingBalance);
  const current = Number(account.currentBalance);
  const maxTotalLoss = account.maxTotalLoss != null ? Number(account.maxTotalLoss) : null;
  const maxDailyLoss = account.maxDailyLoss != null ? Number(account.maxDailyLoss) : null;

  // Drawdown from peak (trailing) — simplified: use (starting - current) clamped at 0
  const drawdownUsed = Math.max(0, starting - current);
  const drawdownRemaining = maxTotalLoss != null ? Math.max(0, maxTotalLoss - drawdownUsed) : null;
  const drawdownPct = maxTotalLoss != null && maxTotalLoss > 0 ? drawdownUsed / maxTotalLoss : null;

  const todayTrades = accTrades.filter((t) => {
    const d = t.exitAt ?? t.entryAt;
    return d ? isToday(new Date(d)) : false;
  });
  const dailyPnl = sumTrades(todayTrades);
  const dailyLossRemaining = maxDailyLoss != null ? Math.max(0, maxDailyLoss + Math.min(0, dailyPnl)) : null;

  return {
    id: account.id,
    name: account.name,
    firm: account.firm,
    phase: account.phase,
    startingBalance: starting,
    currentBalance: current,
    maxTotalLoss,
    maxDailyLoss,
    profitTarget: account.profitTarget != null ? Number(account.profitTarget) : null,
    tradingPnl,
    payouts,
    fees,
    netIncome: tradingPnl + payouts - fees,
    drawdownUsed,
    drawdownRemaining,
    drawdownPct,
    dailyPnl,
    dailyLossRemaining,
    currency: account.currency,
  };
}

export function aggregateFunded(summaries: AccountSummary[]) {
  const funded = summaries.filter((s) => s.phase === "FUNDED");
  const evalCount = summaries.filter((s) => s.phase === "EVAL_1" || s.phase === "EVAL_2").length;
  const totalFundedBalance = funded.reduce((a, b) => a + b.currentBalance, 0);
  const totalAvailableDrawdown = funded.reduce((a, b) => a + (b.drawdownRemaining ?? 0), 0);
  const totalMaxDrawdown = funded.reduce((a, b) => a + (b.maxTotalLoss ?? 0), 0);
  return {
    fundedCount: funded.length,
    evalCount,
    totalFundedBalance,
    totalAvailableDrawdown,
    totalMaxDrawdown,
    totalDrawdownUsed: Math.max(0, totalMaxDrawdown - totalAvailableDrawdown),
  };
}
