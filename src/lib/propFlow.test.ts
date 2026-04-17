import { describe, it, expect } from "vitest";
import { buildIncomeExpenseSeries, rangeToDates, bucketForRange } from "./propFlow";

describe("buildIncomeExpenseSeries", () => {
  it("sums payouts into income and fees into expenses", () => {
    const series = buildIncomeExpenseSeries(
      [
        { type: "PAYOUT" as const, amount: 1000 as unknown as never, occurredAt: new Date("2025-01-05T00:00:00Z") },
        { type: "FEE" as const, amount: 150 as unknown as never, occurredAt: new Date("2025-01-05T00:00:00Z") },
        { type: "SUBSCRIPTION" as const, amount: 85 as unknown as never, occurredAt: new Date("2025-01-06T00:00:00Z") },
      ],
      [],
      { includeTradingPnl: false, bucket: "day" },
    );
    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({ date: "2025-01-05", income: 1000, expenses: 150, net: 850 });
    expect(series[1]).toMatchObject({ date: "2025-01-06", income: 0, expenses: 85, net: -85 });
    expect(series[1].cumIncome).toBe(1000);
    expect(series[1].cumExpenses).toBe(235);
  });

  it("folds trading P&L into income (wins) and expenses (losses)", () => {
    const series = buildIncomeExpenseSeries(
      [],
      [
        { netPnl: 200 as unknown as never, exitAt: new Date("2025-01-10T00:00:00Z"), entryAt: new Date("2025-01-10T00:00:00Z"), status: "CLOSED" as const },
        { netPnl: -50 as unknown as never, exitAt: new Date("2025-01-10T00:00:00Z"), entryAt: new Date("2025-01-10T00:00:00Z"), status: "CLOSED" as const },
      ],
      { includeTradingPnl: true, bucket: "day" },
    );
    expect(series[0].income).toBe(200);
    expect(series[0].expenses).toBe(50);
    expect(series[0].net).toBe(150);
  });
});

describe("rangeToDates / bucketForRange", () => {
  it("ALL returns null from", () => {
    expect(rangeToDates("ALL").from).toBeNull();
  });
  it("picks reasonable buckets", () => {
    expect(bucketForRange("1M")).toBe("day");
    expect(bucketForRange("3M")).toBe("week");
    expect(bucketForRange("1Y")).toBe("month");
  });
});
