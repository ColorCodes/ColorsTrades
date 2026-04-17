import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { computePnl, contractMultiplier } from "@/lib/pnl";

export const dynamic = "force-dynamic";

const tradeSchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(["LONG", "SHORT"]),
  quantity: z.number().positive(),
  entryPrice: z.number(),
  exitPrice: z.number().optional().nullable(),
  entryAt: z.string(),
  exitAt: z.string().optional().nullable(),
  fees: z.number().optional().nullable(),
  instrumentType: z.enum(["FUTURES", "STOCK", "FX", "CRYPTO", "OPTION"]).optional(),
  notes: z.string().optional().nullable(),
});

const bodySchema = z.object({
  sessionId: z.string().min(1),
  accountId: z.string().min(1),
  trades: z.array(tradeSchema),
});

export async function POST(req: NextRequest) {
  const user = await requireUser();
  try {
    const { sessionId, accountId, trades } = bodySchema.parse(await req.json());
    const [session, account] = await Promise.all([
      prisma.llmImportSession.findFirst({ where: { id: sessionId, userId: user.id } }),
      prisma.propFirmAccount.findFirst({ where: { id: accountId, userId: user.id } }),
    ]);
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (!account) return NextResponse.json({ error: "Account not found" }, { status: 404 });

    const creates = trades.map((t) => {
      const instrumentType = t.instrumentType ?? "FUTURES";
      const entryAt = new Date(t.entryAt);
      const exitAt = t.exitAt ? new Date(t.exitAt) : null;
      const multiplier = contractMultiplier(t.symbol, instrumentType);
      const { grossPnl, netPnl, rMultiple } = computePnl({
        side: t.side,
        quantity: t.quantity,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice ?? null,
        fees: t.fees ?? 0,
        multiplier,
      });
      return {
        userId: user.id,
        accountId,
        symbol: t.symbol.toUpperCase(),
        instrumentType,
        side: t.side,
        quantity: t.quantity,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice ?? null,
        entryAt,
        exitAt,
        fees: t.fees ?? 0,
        grossPnl,
        netPnl,
        rMultiple,
        status: (t.exitPrice != null ? "CLOSED" : "OPEN") as "CLOSED" | "OPEN",
        source: "LLM" as const,
        notes: t.notes ?? null,
        tags: [] as string[],
      };
    });

    if (creates.length === 0) {
      return NextResponse.json({ error: "No trades" }, { status: 400 });
    }

    const result = await prisma.$transaction([
      ...creates.map((t) => prisma.trade.create({ data: t })),
      prisma.llmImportSession.update({ where: { id: sessionId }, data: { status: "CONFIRMED", parsedJson: trades } }),
    ]);

    return NextResponse.json({ created: creates.length, resultCount: result.length - 1 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid" }, { status: 400 });
  }
}
