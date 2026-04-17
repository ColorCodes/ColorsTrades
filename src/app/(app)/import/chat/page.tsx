import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { ChatImporter } from "./chat-importer";

const PROVIDER_LABEL: Record<string, string> = {
  ANTHROPIC: "Claude (Anthropic)",
  GOOGLE: "Gemini (Google)",
};

export default async function ChatImportPage() {
  const user = await requireUser();
  const [accounts, dbUser] = await Promise.all([
    prisma.propFirmAccount.findMany({
      where: { userId: user.id, archivedAt: null },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { activeLlmProvider: true, llmApiKeys: { select: { provider: true } } },
    }),
  ]);
  const active = dbUser?.activeLlmProvider ?? null;
  const hasKeyForActive = !!active && !!dbUser?.llmApiKeys.some((k) => k.provider === active);
  const enabled = !!active && hasKeyForActive;

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">AI chat import</h1>
        <p className="text-sm text-muted-foreground">
          Paste a broker statement, screenshot-to-text output, or free-form trade description.{" "}
          {active ? PROVIDER_LABEL[active] : "An AI model"} will parse it into structured trades for you to review.
        </p>
      </div>
      {!enabled && (
        <div className="rounded-md border border-warning/50 bg-warning/10 text-warning-foreground p-3 text-sm">
          No LLM provider is configured.{" "}
          <Link href="/settings" className="underline">Go to Settings</Link> to pick Anthropic or Google and add a key.
        </div>
      )}
      <ChatImporter accounts={accounts.map((a) => ({ id: a.id, name: a.name }))} enabled={enabled} />
    </div>
  );
}
