import type { Trade } from "@prisma/client";

export interface TradeLike {
  entryAt: Date;
  exitAt: Date | null;
  netPnl: number | null;
  grossPnl: number | null;
  fees: number;
  symbol: string;
  side: "LONG" | "SHORT";
  tags: string[];
  status: "OPEN" | "CLOSED";
}

export function toTradeLike(t: Trade): TradeLike {
  return {
    entryAt: t.entryAt,
    exitAt: t.exitAt,
    netPnl: t.netPnl != null ? Number(t.netPnl) : null,
    grossPnl: t.grossPnl != null ? Number(t.grossPnl) : null,
    fees: Number(t.fees ?? 0),
    symbol: t.symbol,
    side: t.side as "LONG" | "SHORT",
    tags: t.tags,
    status: t.status as "OPEN" | "CLOSED",
  };
}

export interface Kpis {
  totalNet: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  profitFactor: number;
  trades: number;
  wins: number;
  losses: number;
  maxDrawdown: number;
}

export function computeKpis(trades: TradeLike[]): Kpis {
  const closed = trades.filter((t) => t.status === "CLOSED" && t.netPnl != null);
  const nets = closed.map((t) => t.netPnl as number);
  const wins = nets.filter((n) => n > 0);
  const losses = nets.filter((n) => n < 0);
  const totalNet = nets.reduce((a, b) => a + b, 0);
  const grossWin = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
  const winRate = closed.length ? wins.length / closed.length : 0;
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const expectancy = closed.length ? totalNet / closed.length : 0;
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;

  // Max drawdown on running equity curve
  let peak = 0;
  let running = 0;
  let maxDd = 0;
  const sorted = [...closed].sort((a, b) => a.entryAt.getTime() - b.entryAt.getTime());
  for (const t of sorted) {
    running += t.netPnl as number;
    if (running > peak) peak = running;
    const dd = peak - running;
    if (dd > maxDd) maxDd = dd;
  }

  return {
    totalNet,
    winRate,
    avgWin,
    avgLoss,
    expectancy,
    profitFactor,
    trades: closed.length,
    wins: wins.length,
    losses: losses.length,
    maxDrawdown: maxDd,
  };
}

export function equityCurve(trades: TradeLike[]): { date: string; equity: number }[] {
  const closed = trades.filter((t) => t.status === "CLOSED" && t.netPnl != null);
  const sorted = [...closed].sort((a, b) => (a.exitAt ?? a.entryAt).getTime() - (b.exitAt ?? b.entryAt).getTime());
  let running = 0;
  return sorted.map((t) => {
    running += t.netPnl as number;
    const d = (t.exitAt ?? t.entryAt).toISOString().slice(0, 10);
    return { date: d, equity: running };
  });
}

export function dailyPnl(trades: TradeLike[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of trades) {
    if (t.status !== "CLOSED" || t.netPnl == null) continue;
    const d = (t.exitAt ?? t.entryAt).toISOString().slice(0, 10);
    map.set(d, (map.get(d) ?? 0) + (t.netPnl as number));
  }
  return map;
}

export function groupNetBy<K extends keyof TradeLike>(trades: TradeLike[], key: K): { key: string; net: number; count: number }[] {
  const map = new Map<string, { net: number; count: number }>();
  for (const t of trades) {
    if (t.status !== "CLOSED" || t.netPnl == null) continue;
    const raw = t[key];
    const k = Array.isArray(raw) ? (raw.length ? raw.join(",") : "(none)") : String(raw ?? "");
    const prev = map.get(k) ?? { net: 0, count: 0 };
    map.set(k, { net: prev.net + (t.netPnl as number), count: prev.count + 1 });
  }
  return Array.from(map.entries())
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.net - a.net);
}

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function netByDayOfWeek(trades: TradeLike[]): { key: string; net: number; count: number }[] {
  const buckets = new Array(7).fill(0).map(() => ({ net: 0, count: 0 }));
  for (const t of trades) {
    if (t.status !== "CLOSED" || t.netPnl == null) continue;
    const dow = (t.exitAt ?? t.entryAt).getDay();
    buckets[dow].net += t.netPnl as number;
    buckets[dow].count += 1;
  }
  return buckets.map((b, i) => ({ key: DOW_LABELS[i], ...b }));
}

export function netByHour(trades: TradeLike[]): { key: string; net: number; count: number }[] {
  const buckets = new Array(24).fill(0).map(() => ({ net: 0, count: 0 }));
  for (const t of trades) {
    if (t.status !== "CLOSED" || t.netPnl == null) continue;
    const h = (t.exitAt ?? t.entryAt).getHours();
    buckets[h].net += t.netPnl as number;
    buckets[h].count += 1;
  }
  return buckets.map((b, i) => ({ key: `${i.toString().padStart(2, "0")}:00`, ...b }));
}
