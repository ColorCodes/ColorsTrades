import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { TradeForm } from "../trade-form";
import { DeleteTradeButton } from "./delete-button";

export default async function TradeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const trade = await prisma.trade.findFirst({ where: { id, userId: user.id }, include: { account: true } });
  if (!trade) notFound();

  const accounts = await prisma.propFirmAccount.findMany({
    where: { userId: user.id, archivedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const net = Number(trade.netPnl ?? 0);
  const gross = Number(trade.grossPnl ?? 0);

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">{trade.symbol}</h1>
        <Button asChild variant="outline" size="sm"><Link href="/trades">Back</Link></Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <Stat label="Side" value={<Badge variant={trade.side === "LONG" ? "default" : "secondary"}>{trade.side}</Badge>} />
          <Stat label="Status" value={<Badge variant="outline">{trade.status}</Badge>} />
          <Stat label="Account" value={trade.account.name} />
          <Stat label="Quantity" value={String(trade.quantity)} />
          <Stat label="Entry" value={formatNumber(Number(trade.entryPrice), 4)} />
          <Stat label="Exit" value={trade.exitPrice != null ? formatNumber(Number(trade.exitPrice), 4) : "—"} />
          <Stat label="Gross P&L" value={<span className={gross >= 0 ? "text-success" : "text-destructive"}>{formatCurrency(gross)}</span>} />
          <Stat label="Net P&L" value={<span className={net >= 0 ? "text-success" : "text-destructive"}>{formatCurrency(net)}</span>} />
          <Stat label="R multiple" value={trade.rMultiple != null ? `${formatNumber(Number(trade.rMultiple), 2)}R` : "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Edit</CardTitle></CardHeader>
        <CardContent>
          <TradeForm
            id={trade.id}
            accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
            initial={{
              accountId: trade.accountId,
              symbol: trade.symbol,
              instrumentType: trade.instrumentType,
              side: trade.side,
              quantity: Number(trade.quantity),
              entryPrice: Number(trade.entryPrice),
              exitPrice: trade.exitPrice != null ? Number(trade.exitPrice) : "",
              entryAt: trade.entryAt.toISOString(),
              exitAt: trade.exitAt ? trade.exitAt.toISOString() : "",
              fees: Number(trade.fees ?? 0),
              stopLoss: trade.stopLoss != null ? Number(trade.stopLoss) : "",
              takeProfit: trade.takeProfit != null ? Number(trade.takeProfit) : "",
              tags: trade.tags,
              notes: trade.notes,
            }}
          />
        </CardContent>
      </Card>

      <DeleteTradeButton id={trade.id} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
