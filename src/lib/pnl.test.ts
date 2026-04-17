import { describe, it, expect } from "vitest";
import { computePnl, contractMultiplier } from "./pnl";

describe("computePnl", () => {
  it("returns null when no exit", () => {
    const r = computePnl({ side: "LONG", quantity: 1, entryPrice: 100, exitPrice: null });
    expect(r).toEqual({ grossPnl: null, netPnl: null, rMultiple: null });
  });

  it("computes long P&L with multiplier and fees", () => {
    const r = computePnl({ side: "LONG", quantity: 2, entryPrice: 5100, exitPrice: 5105, fees: 4, multiplier: 50 });
    expect(r.grossPnl).toBe(500);
    expect(r.netPnl).toBe(496);
  });

  it("computes short P&L correctly", () => {
    const r = computePnl({ side: "SHORT", quantity: 1, entryPrice: 18000, exitPrice: 17950, fees: 2.5, multiplier: 20 });
    expect(r.grossPnl).toBe(1000);
    expect(r.netPnl).toBe(997.5);
  });

  it("computes R-multiple using stop loss", () => {
    const r = computePnl({ side: "LONG", quantity: 1, entryPrice: 100, exitPrice: 110, stopLoss: 95, multiplier: 1 });
    expect(r.netPnl).toBe(10);
    expect(r.rMultiple).toBeCloseTo(2);
  });
});

describe("contractMultiplier", () => {
  it("returns known futures multipliers", () => {
    expect(contractMultiplier("ES", "FUTURES")).toBe(50);
    expect(contractMultiplier("NQ", "FUTURES")).toBe(20);
    expect(contractMultiplier("CL", "FUTURES")).toBe(1000);
  });
  it("returns 100 for options", () => {
    expect(contractMultiplier("SPY", "OPTION")).toBe(100);
  });
  it("returns 1 for stocks", () => {
    expect(contractMultiplier("AAPL", "STOCK")).toBe(1);
  });
});
