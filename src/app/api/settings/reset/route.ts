import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await requireUser();
  let scope: string | undefined;
  try {
    const body = await req.json();
    scope = typeof body?.scope === "string" ? body.scope : undefined;
  } catch {}

  const counts = await prisma.$transaction(async (tx) => {
    if (scope === "trades") {
      const trades = await tx.trade.deleteMany({ where: { userId: user.id } });
      return { trades: trades.count, transactions: 0, accounts: 0, journal: 0 };
    }
    const trades = await tx.trade.deleteMany({ where: { userId: user.id } });
    const transactions = await tx.accountTransaction.deleteMany({ where: { userId: user.id } });
    const accounts = await tx.propFirmAccount.deleteMany({ where: { userId: user.id } });
    const journal = await tx.journalEntry.deleteMany({ where: { userId: user.id } });
    return { trades: trades.count, transactions: transactions.count, accounts: accounts.count, journal: journal.count };
  });

  return NextResponse.json({ ok: true, deleted: counts });
}
