import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { groupNetBy, netByDayOfWeek, netByHour, toTradeLike } from "@/lib/analytics";

export default async function ReportsPage() {
  const user = await requireUser();
  const trades = await prisma.trade.findMany({ where: { userId: user.id }, orderBy: { entryAt: "desc" } });
  const tl = trades.map(toTradeLike);

  const bySymbol = groupNetBy(tl, "symbol");
  const byTag = groupNetBy(tl, "tags");
  const byDow = netByDayOfWeek(tl);
  const byHour = netByHour(tl).filter((b) => b.count > 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl sm:text-2xl font-bold">Reports</h1>
      <Tabs defaultValue="symbol">
        <TabsList className="w-full overflow-x-auto no-scrollbar justify-start">
          <TabsTrigger value="symbol">By symbol</TabsTrigger>
          <TabsTrigger value="tag">By tag</TabsTrigger>
          <TabsTrigger value="dow">By day</TabsTrigger>
          <TabsTrigger value="hour">By hour</TabsTrigger>
        </TabsList>
        <TabsContent value="symbol"><ReportTable title="Symbol" rows={bySymbol} /></TabsContent>
        <TabsContent value="tag"><ReportTable title="Tag" rows={byTag} /></TabsContent>
        <TabsContent value="dow"><ReportTable title="Day of week" rows={byDow} /></TabsContent>
        <TabsContent value="hour"><ReportTable title="Hour" rows={byHour} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ReportTable({ title, rows }: { title: string; rows: { key: string; net: number; count: number }[] }) {
  if (rows.length === 0) {
    return (
      <Card><CardContent className="p-6 text-sm text-muted-foreground">No data yet.</CardContent></Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{title}</TableHead>
              <TableHead className="text-right">Trades</TableHead>
              <TableHead className="text-right">Net P&L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.key}>
                <TableCell>{r.key}</TableCell>
                <TableCell className="text-right">{r.count}</TableCell>
                <TableCell className={`text-right font-medium ${r.net >= 0 ? "text-success" : "text-destructive"}`}>{formatCurrency(r.net)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
