import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { TradeForm } from "../trade-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function NewTradePage() {
  const user = await requireUser();
  const accounts = await prisma.propFirmAccount.findMany({
    where: { userId: user.id, archivedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Create an account first</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">You need a prop-firm account before logging trades.</p>
          <Button asChild className="w-fit"><Link href="/accounts/new">Create account</Link></Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <h1 className="text-xl sm:text-2xl font-bold">New trade</h1>
      <TradeForm accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} />
    </div>
  );
}
