import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function NotebookPage() {
  const user = await requireUser();
  const entries = await prisma.journalEntry.findMany({ where: { userId: user.id }, orderBy: { date: "desc" } });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold">Notebook</h1>
        <Button asChild><Link href="/notebook/new"><Plus className="size-4" /> New entry</Link></Button>
      </div>

      {entries.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No entries yet.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {entries.map((e) => (
            <Link key={e.id} href={`/notebook/${e.id}`}>
              <Card className="h-full hover:bg-accent transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="truncate text-base">{e.title}</CardTitle>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{new Date(e.date).toLocaleDateString()}</span>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{e.bodyMarkdown || "—"}</CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
