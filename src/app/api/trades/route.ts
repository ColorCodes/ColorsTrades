import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { createTrade } from "@/lib/trades";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await requireUser();
  const url = new URL(req.url);
  const accountId = url.searchParams.get("accountId") ?? undefined;
  const symbol = url.searchParams.get("symbol") ?? undefined;
  const side = url.searchParams.get("side") ?? undefined;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const take = Math.min(Number(url.searchParams.get("take") ?? 100), 500);
  const skip = Number(url.searchParams.get("skip") ?? 0);

  const trades = await prisma.trade.findMany({
    where: {
      userId: user.id,
      ...(accountId ? { accountId } : {}),
      ...(symbol ? { symbol } : {}),
      ...(side ? { side: side as "LONG" | "SHORT" } : {}),
      ...(from || to
        ? {
            entryAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { entryAt: "desc" },
    take,
    skip,
  });
  return NextResponse.json({ trades });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  try {
    const body = await req.json();
    const trade = await createTrade(user.id, body);
    return NextResponse.json({ trade }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid" }, { status: 400 });
  }
}
