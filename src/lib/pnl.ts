import { TradeSide } from "@prisma/client";

export const FUTURES_MULTIPLIERS: Record<string, number> = {
  ES: 50,
  MES: 5,
  NQ: 20,
  MNQ: 2,
  YM: 5,
  MYM: 0.5,
  RTY: 50,
  M2K: 5,
  CL: 1000,
  MCL: 100,
  GC: 100,
  MGC: 10,
  SI: 5000,
  NG: 10000,
  ZB: 1000,
  ZN: 1000,
};

export function contractMultiplier(symbol: string, instrumentType: "FUTURES" | "STOCK" | "FX" | "CRYPTO" | "OPTION"): number {
  if (instrumentType === "FUTURES") return FUTURES_MULTIPLIERS[symbol.toUpperCase()] ?? 1;
  if (instrumentType === "OPTION") return 100;
  return 1;
}

export interface PnlInput {
  side: TradeSide | "LONG" | "SHORT";
  quantity: number;
  entryPrice: number;
  exitPrice?: number | null;
  fees?: number | null;
  stopLoss?: number | null;
  multiplier?: number;
}

export interface PnlResult {
  grossPnl: number | null;
  netPnl: number | null;
  rMultiple: number | null;
}

export function computePnl(input: PnlInput): PnlResult {
  const { side, quantity, entryPrice, exitPrice, fees, stopLoss } = input;
  const mult = input.multiplier ?? 1;
  if (exitPrice == null) return { grossPnl: null, netPnl: null, rMultiple: null };
  const sideMult = side === "LONG" ? 1 : -1;
  const gross = (exitPrice - entryPrice) * sideMult * quantity * mult;
  const net = gross - (fees ?? 0);
  let rMultiple: number | null = null;
  if (stopLoss != null) {
    const riskPerUnit = Math.abs(entryPrice - stopLoss) * mult;
    const risk = riskPerUnit * quantity;
    if (risk > 0) rMultiple = net / risk;
  }
  return { grossPnl: gross, netPnl: net, rMultiple };
}
