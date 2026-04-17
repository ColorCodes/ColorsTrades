import { describe, it, expect } from "vitest";
import { computeKpis, equityCurve, groupNetBy, type TradeLike } from "./analytics";

function t(net: number, date: string, symbol = "ES", side: "LONG" | "SHORT" = "LONG", tags: string[] = []): TradeLike {
  const d = new Date(date);
  return { entryAt: d, exitAt: d, netPnl: net, grossPnl: net, fees: 0, symbol, side, tags, status: "CLOSED" };
}

describe("computeKpis", () => {
  it("computes win rate, profit factor, expectancy", () => {
    const trades = [t(100, "2025-01-01"), t(-50, "2025-01-02"), t(200, "2025-01-03"), t(-25, "2025-01-04")];
    const k = computeKpis(trades);
    expect(k.totalNet).toBe(225);
    expect(k.wins).toBe(2);
    expect(k.losses).toBe(2);
    expect(k.winRate).toBe(0.5);
    expect(k.profitFactor).toBe(300 / 75);
    expect(k.expectancy).toBeCloseTo(225 / 4);
  });

  it("computes max drawdown from running equity", () => {
    const trades = [t(100, "2025-01-01"), t(-150, "2025-01-02"), t(50, "2025-01-03")];
    const k = computeKpis(trades);
    // peak 100 then -50 -> drawdown 150
    expect(k.maxDrawdown).toBe(150);
  });
});

describe("equityCurve", () => {
  it("accumulates net P&L over time", () => {
    const curve = equityCurve([t(100, "2025-01-01"), t(-50, "2025-01-02"), t(25, "2025-01-03")]);
    expect(curve.map((c) => c.equity)).toEqual([100, 50, 75]);
  });
});

describe("groupNetBy", () => {
  it("groups by symbol", () => {
    const rows = groupNetBy([t(50, "2025-01-01", "ES"), t(-25, "2025-01-02", "NQ"), t(10, "2025-01-03", "ES")], "symbol");
    const es = rows.find((r) => r.key === "ES");
    expect(es).toMatchObject({ net: 60, count: 2 });
  });
});
