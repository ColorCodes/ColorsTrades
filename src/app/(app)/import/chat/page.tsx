import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ChatImporter } from "./chat-importer";

export default async function ChatImportPage() {
  const user = await requireUser();
  const accounts = await prisma.propFirmAccount.findMany({
    where: { userId: user.id, archivedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">AI chat import</h1>
        <p className="text-sm text-muted-foreground">Paste a broker statement, screenshot-to-text output, or free-form trade description. Claude will parse it into structured trades for you to review.</p>
      </div>
      {!hasKey && (
        <div className="rounded-md border border-warning/50 bg-warning/10 text-warning-foreground p-3 text-sm">
          ANTHROPIC_API_KEY is not configured. Set it in your environment to enable this importer.
        </div>
      )}
      <ChatImporter accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} enabled={hasKey} />
    </div>
  );
}
