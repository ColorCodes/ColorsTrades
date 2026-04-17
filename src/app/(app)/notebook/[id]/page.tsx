import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { JournalForm } from "../journal-form";
import { DeleteJournalButton } from "./delete-button";

export default async function JournalDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const entry = await prisma.journalEntry.findFirst({ where: { id, userId: user.id } });
  if (!entry) notFound();
  const tags = Array.isArray(entry.tagsJson) ? (entry.tagsJson as string[]) : [];

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold truncate">{entry.title}</h1>
        <Button asChild variant="outline" size="sm"><Link href="/notebook">Back</Link></Button>
      </div>
      <JournalForm
        initial={{
          id: entry.id,
          date: entry.date.toISOString().slice(0, 10),
          title: entry.title,
          bodyMarkdown: entry.bodyMarkdown,
          tags,
        }}
      />
      <DeleteJournalButton id={entry.id} />
    </div>
  );
}
