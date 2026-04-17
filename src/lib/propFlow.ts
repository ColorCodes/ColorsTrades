import type { AccountTransaction, Trade } from "@prisma/client";

export type BucketSize = "day" | "week" | "month";

export interface PropFlowOptions {
  includeTradingPnl: boolean;
  bucket: BucketSize;
}

export interface FlowPoint {
  date: string;
  income: number;
  expenses: number;
  net: number;
  cumIncome: number;
  cumExpenses: number;
  cumNet: number;
}

const EXPENSE_TYPES = new Set(["FEE", "SUBSCRIPTION", "RESET"]);
const INCOME_TYPES = new Set(["PAYOUT"]);

function bucketKey(d: Date, bucket: BucketSize): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  if (bucket === "day") return `${yyyy}-${mm}-${dd}`;
  if (bucket === "month") return `${yyyy}-${mm}-01`;
  // week: Monday anchor
  const copy = new Date(Date.UTC(yyyy, d.getUTCMonth(), d.getUTCDate()));
  const day = copy.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  copy.setUTCDate(copy.getUTCDate() + diff);
  const wy = copy.getUTCFullYear();
  const wm = String(copy.getUTCMonth() + 1).padStart(2, "0");
  const wd = String(copy.getUTCDate()).padStart(2, "0");
  return `${wy}-${wm}-${wd}`;
}

export function buildIncomeExpenseSeries(
  transactions: Pick<AccountTransaction, "type" | "amount" | "occurredAt">[],
  trades: Pick<Trade, "netPnl" | "exitAt" | "entryAt" | "status">[],
  opts: PropFlowOptions = { includeTradingPnl: true, bucket: "day" },
): FlowPoint[] {
  const map = new Map<string, { income: number; expenses: number }>();

  for (const tx of transactions) {
    const amt = Number(tx.amount);
    const key = bucketKey(new Date(tx.occurredAt), opts.bucket);
    const entry = map.get(key) ?? { income: 0, expenses: 0 };
    if (INCOME_TYPES.has(tx.type)) entry.income += amt;
    else if (EXPENSE_TYPES.has(tx.type)) entry.expenses += amt;
    map.set(key, entry);
  }

  if (opts.includeTradingPnl) {
    for (const t of trades) {
      if (t.status !== "CLOSED" || t.netPnl == null) continue;
      const net = Number(t.netPnl);
      if (net === 0) continue;
      const d = t.exitAt ?? t.entryAt;
      const key = bucketKey(new Date(d), opts.bucket);
      const entry = map.get(key) ?? { income: 0, expenses: 0 };
      if (net > 0) entry.income += net;
      else entry.expenses += -net;
      map.set(key, entry);
    }
  }

  const sorted = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  let cumI = 0;
  let cumE = 0;
  return sorted.map(([date, { income, expenses }]) => {
    cumI += income;
    cumE += expenses;
    return {
      date,
      income,
      expenses,
      net: income - expenses,
      cumIncome: cumI,
      cumExpenses: cumE,
      cumNet: cumI - cumE,
    };
  });
}

export function rangeToDates(range: "1M" | "3M" | "6M" | "YTD" | "1Y" | "ALL"): { from: Date | null; to: Date } {
  const now = new Date();
  const to = now;
  if (range === "ALL") return { from: null, to };
  const from = new Date(now);
  switch (range) {
    case "1M":
      from.setMonth(from.getMonth() - 1);
      break;
    case "3M":
      from.setMonth(from.getMonth() - 3);
      break;
    case "6M":
      from.setMonth(from.getMonth() - 6);
      break;
    case "YTD":
      from.setMonth(0);
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      break;
    case "1Y":
      from.setFullYear(from.getFullYear() - 1);
      break;
  }
  return { from, to };
}

export function bucketForRange(range: "1M" | "3M" | "6M" | "YTD" | "1Y" | "ALL"): BucketSize {
  if (range === "1M") return "day";
  if (range === "3M" || range === "6M" || range === "YTD") return "week";
  return "month";
}
