import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { computePnl, contractMultiplier } from "@/lib/pnl";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  accountId: z.string().min(1),
  mapping: z.record(z.string(), z.string().optional()),
  rows: z.array(z.record(z.string(), z.string())),
});

const SIDE_MAP: Record<string, "LONG" | "SHORT"> = {
  LONG: "LONG",
  SHORT: "SHORT",
  BUY: "LONG",
  SELL: "SHORT",
  B: "LONG",
  S: "SHORT",
};

function parseNum(v: string | undefined): number | null {
  if (v == null || v === "") return null;
  const cleaned = String(v).replace(/[$,\s]/g, "").replace(/[()]/g, (m) => (m === "(" ? "-" : ""));
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDate(v: string | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  try {
    const { accountId, mapping, rows } = bodySchema.parse(await req.json());
    const account = await prisma.propFirmAccount.findFirst({ where: { id: accountId, userId: user.id } });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const pick = (row: Record<string, string>, key: string) => {
      const col = mapping[key];
      if (!col) return undefined;
      return row[col];
    };

    const errors: { index: number; reason: string }[] = [];
    const toCreate = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const symbol = (pick(r, "symbol") ?? "").trim().toUpperCase();
      const sideRaw = (pick(r, "side") ?? "").trim().toUpperCase();
      const side = SIDE_MAP[sideRaw];
      const quantity = parseNum(pick(r, "quantity"));
      const entryPrice = parseNum(pick(r, "entryPrice"));
      const entryAt = parseDate(pick(r, "entryAt"));
      if (!symbol || !side || quantity == null || entryPrice == null || !entryAt) {
        errors.push({ index: i, reason: "missing required field" });
        continue;
      }
      const exitPrice = parseNum(pick(r, "exitPrice"));
      const exitAt = parseDate(pick(r, "exitAt"));
      const fees = parseNum(pick(r, "fees")) ?? 0;
      const stopLoss = parseNum(pick(r, "stopLoss"));
      const takeProfit = parseNum(pick(r, "takeProfit"));
      const notes = pick(r, "notes") ?? null;
      const instRaw = (pick(r, "instrumentType") ?? "").trim().toUpperCase();
      const instrumentType = (["FUTURES", "STOCK", "FX", "CRYPTO", "OPTION"].includes(instRaw) ? instRaw : "FUTURES") as "FUTURES" | "STOCK" | "FX" | "CRYPTO" | "OPTION";

      const multiplier = contractMultiplier(symbol, instrumentType);
      const { grossPnl, netPnl, rMultiple } = computePnl({ side, quantity, entryPrice, exitPrice, fees, stopLoss, multiplier });

      toCreate.push({
        userId: user.id,
        accountId,
        symbol,
        instrumentType,
        side,
        quantity,
        entryPrice,
        exitPrice,
        entryAt,
        exitAt,
        fees,
        stopLoss,
        takeProfit,
        grossPnl,
        netPnl,
        rMultiple,
        status: (exitPrice != null ? "CLOSED" : "OPEN") as "CLOSED" | "OPEN",
        source: "CSV" as const,
        notes,
        tags: [] as string[],
      });
    }

    if (toCreate.length === 0) {
      return NextResponse.json({ error: "No valid rows", errors }, { status: 400 });
    }

    const result = await prisma.$transaction(toCreate.map((t) => prisma.trade.create({ data: t })));
    return NextResponse.json({ created: result.length, skipped: errors.length, errors });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid" }, { status: 400 });
  }
}
