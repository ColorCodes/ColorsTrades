import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, MessageSquare, FileText } from "lucide-react";

export default function ImportHome() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl sm:text-2xl font-bold">Import trades</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/trades/new">
          <Card className="h-full hover:bg-accent transition-colors">
            <CardHeader><FileText className="size-5 text-primary" /><CardTitle>Manual entry</CardTitle><CardDescription>Log a single trade by hand</CardDescription></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Best for one-offs or open positions.</CardContent>
          </Card>
        </Link>
        <Link href="/import/csv">
          <Card className="h-full hover:bg-accent transition-colors">
            <CardHeader><Upload className="size-5 text-primary" /><CardTitle>CSV import</CardTitle><CardDescription>Bulk upload with column mapping</CardDescription></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Works with any broker CSV.</CardContent>
          </Card>
        </Link>
        <Link href="/import/chat">
          <Card className="h-full hover:bg-accent transition-colors">
            <CardHeader><MessageSquare className="size-5 text-primary" /><CardTitle>AI chat</CardTitle><CardDescription>Paste trades, Claude parses them</CardDescription></CardHeader>
            <CardContent className="text-sm text-muted-foreground">Requires ANTHROPIC_API_KEY.</CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
