import { PrismaClient, PropFirmPhase, TradeSide, TradeStatus, TradeSource, InstrumentType, TransactionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_EMAIL ?? "owner@local";
  const password = process.env.SEED_PASSWORD ?? "changeme";
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, name: "Owner" },
  });

  const existingAccounts = await prisma.propFirmAccount.count({ where: { userId: user.id } });
  if (existingAccounts > 0) {
    console.log(`Seed: user ${email} already has ${existingAccounts} account(s). Skipping demo data.`);
    return;
  }

  const funded = await prisma.propFirmAccount.create({
    data: {
      userId: user.id,
      name: "Apex 50K — Funded",
      firm: "Apex",
      accountNumber: "APX-50K-001",
      phase: PropFirmPhase.FUNDED,
      startingBalance: 50000,
      currentBalance: 52450,
      profitTarget: 3000,
      maxDailyLoss: 1500,
      maxTotalLoss: 2500,
      payoutSplit: 0.9,
      currency: "USD",
    },
  });

  const eval1 = await prisma.propFirmAccount.create({
    data: {
      userId: user.id,
      name: "TopStep 50K — Eval",
      firm: "TopStep",
      accountNumber: "TS-50K-EVAL",
      phase: PropFirmPhase.EVAL_1,
      startingBalance: 50000,
      currentBalance: 51200,
      profitTarget: 3000,
      maxDailyLoss: 1000,
      maxTotalLoss: 2000,
      currency: "USD",
    },
  });

  await prisma.accountTransaction.createMany({
    data: [
      { userId: user.id, accountId: funded.id, type: TransactionType.SUBSCRIPTION, amount: 85, occurredAt: daysAgo(60), memo: "Monthly subscription" },
      { userId: user.id, accountId: funded.id, type: TransactionType.SUBSCRIPTION, amount: 85, occurredAt: daysAgo(30), memo: "Monthly subscription" },
      { userId: user.id, accountId: funded.id, type: TransactionType.PAYOUT, amount: 1800, occurredAt: daysAgo(20), memo: "First payout" },
      { userId: user.id, accountId: funded.id, type: TransactionType.PAYOUT, amount: 2100, occurredAt: daysAgo(5), memo: "Second payout" },
      { userId: user.id, accountId: eval1.id, type: TransactionType.FEE, amount: 167, occurredAt: daysAgo(45), memo: "Evaluation fee" },
    ],
  });

  const tradeRows = [
    { symbol: "ES", side: TradeSide.LONG, qty: 2, entry: 5120.25, exit: 5128.5, entryAt: daysAgo(18, 9), exitAt: daysAgo(18, 10), fees: 4.5 },
    { symbol: "NQ", side: TradeSide.SHORT, qty: 1, entry: 17850, exit: 17820, entryAt: daysAgo(17, 10), exitAt: daysAgo(17, 11), fees: 2.5 },
    { symbol: "ES", side: TradeSide.LONG, qty: 1, entry: 5130, exit: 5124, entryAt: daysAgo(14, 9), exitAt: daysAgo(14, 10), fees: 2.5 },
    { symbol: "CL", side: TradeSide.SHORT, qty: 1, entry: 78.2, exit: 77.5, entryAt: daysAgo(12, 11), exitAt: daysAgo(12, 12), fees: 2.5 },
    { symbol: "NQ", side: TradeSide.LONG, qty: 1, entry: 18010, exit: 18060, entryAt: daysAgo(8, 9), exitAt: daysAgo(8, 10), fees: 2.5 },
    { symbol: "ES", side: TradeSide.LONG, qty: 2, entry: 5200, exit: 5196, entryAt: daysAgo(6, 10), exitAt: daysAgo(6, 11), fees: 4.5 },
    { symbol: "NQ", side: TradeSide.LONG, qty: 1, entry: 18200, exit: 18285, entryAt: daysAgo(3, 9), exitAt: daysAgo(3, 10), fees: 2.5 },
  ];

  for (const t of tradeRows) {
    const sideMult = t.side === TradeSide.LONG ? 1 : -1;
    const mult = t.symbol === "ES" ? 50 : t.symbol === "NQ" ? 20 : t.symbol === "CL" ? 1000 : 1;
    const gross = (t.exit - t.entry) * sideMult * t.qty * mult;
    const net = gross - t.fees;
    await prisma.trade.create({
      data: {
        userId: user.id,
        accountId: funded.id,
        symbol: t.symbol,
        instrumentType: InstrumentType.FUTURES,
        side: t.side,
        quantity: t.qty,
        entryPrice: t.entry,
        exitPrice: t.exit,
        entryAt: t.entryAt,
        exitAt: t.exitAt,
        fees: t.fees,
        grossPnl: gross,
        netPnl: net,
        status: TradeStatus.CLOSED,
        source: TradeSource.MANUAL,
        tags: [],
      },
    });
  }

  console.log(`Seed complete. Login as ${email} / ${password}`);
}

function daysAgo(days: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
