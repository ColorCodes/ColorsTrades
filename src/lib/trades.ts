import { prisma } from "@/lib/db";
import { TradeStatus, TradeSource } from "@prisma/client";
import { computePnl, contractMultiplier } from "@/lib/pnl";
import { tradeCreateSchema, tradeUpdateSchema, type TradeCreateInput } from "@/lib/schemas/trade";

export async function createTrade(userId: string, raw: unknown) {
  const data = tradeCreateSchema.parse(raw);
  return persist(userId, data, null);
}

export async function updateTrade(userId: string, id: string, raw: unknown) {
  const data = tradeUpdateSchema.parse(raw);
  return persist(userId, data, id);
}

async function persist(userId: string, data: Partial<TradeCreateInput>, existingId: string | null) {
  let prev: Awaited<ReturnType<typeof prisma.trade.findFirst>> | null = null;
  if (existingId) {
    prev = await prisma.trade.findFirst({ where: { id: existingId, userId } });
    if (!prev) throw new Error("Trade not found");
  }

  const symbol = data.symbol ?? prev?.symbol ?? "";
  const instrumentType = data.instrumentType ?? prev?.instrumentType ?? "FUTURES";
  const side = data.side ?? prev?.side ?? "LONG";
  const quantity = Number(data.quantity ?? prev?.quantity ?? 0);
  const entryPrice = Number(data.entryPrice ?? prev?.entryPrice ?? 0);
  const exitPrice = data.exitPrice !== undefined ? data.exitPrice : prev?.exitPrice != null ? Number(prev.exitPrice) : null;
  const fees = data.fees !== undefined ? data.fees : prev?.fees != null ? Number(prev.fees) : 0;
  const stopLoss = data.stopLoss !== undefined ? data.stopLoss : prev?.stopLoss != null ? Number(prev.stopLoss) : null;
  const takeProfit = data.takeProfit !== undefined ? data.takeProfit : prev?.takeProfit != null ? Number(prev.takeProfit) : null;
  const entryAt = data.entryAt ?? prev?.entryAt ?? new Date();
  const exitAt = data.exitAt !== undefined ? data.exitAt : prev?.exitAt ?? null;
  const accountId = data.accountId ?? prev?.accountId;
  const tags = data.tags ?? prev?.tags ?? [];
  const notes = data.notes !== undefined ? data.notes : prev?.notes ?? null;
  const source = data.source ?? prev?.source ?? TradeSource.MANUAL;

  if (!accountId) throw new Error("accountId is required");

  // Verify account belongs to user
  const account = await prisma.propFirmAccount.findFirst({ where: { id: accountId, userId } });
  if (!account) throw new Error("Account not found");

  const multiplier = contractMultiplier(symbol, instrumentType);
  const { grossPnl, netPnl, rMultiple } = computePnl({ side, quantity, entryPrice, exitPrice, fees, stopLoss, multiplier });
  const status: TradeStatus = exitPrice != null ? TradeStatus.CLOSED : TradeStatus.OPEN;

  const payload = {
    userId,
    accountId,
    symbol,
    instrumentType,
    side,
    quantity,
    entryPrice,
    exitPrice,
    entryAt,
    exitAt,
    fees: fees ?? 0,
    stopLoss,
    takeProfit,
    grossPnl,
    netPnl,
    rMultiple,
    status,
    tags,
    notes,
    source,
  };

  if (existingId) {
    return prisma.trade.update({ where: { id: existingId }, data: payload });
  }
  return prisma.trade.create({ data: payload });
}

export async function deleteTrade(userId: string, id: string) {
  const trade = await prisma.trade.findFirst({ where: { id, userId } });
  if (!trade) throw new Error("Trade not found");
  await prisma.trade.delete({ where: { id } });
}
