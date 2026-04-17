import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getDecryptedApiKey } from "@/lib/llm-settings";
import { extractTrades } from "@/lib/llm-extract";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({ text: z.string().min(1).max(50_000) });

export async function POST(req: NextRequest) {
  const user = await requireUser();

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { activeLlmProvider: true },
  });
  const provider = dbUser?.activeLlmProvider;
  if (!provider) {
    return NextResponse.json(
      { error: "No LLM provider selected. Configure one in Settings." },
      { status: 503 },
    );
  }

  if (!process.env.ENCRYPTION_KEY) {
    return NextResponse.json({ error: "ENCRYPTION_KEY is not set on the server" }, { status: 503 });
  }

  const apiKey = await getDecryptedApiKey(user.id, provider);
  if (!apiKey) {
    return NextResponse.json(
      { error: `No ${provider} key configured. Add one in Settings.` },
      { status: 503 },
    );
  }

  try {
    const { text } = bodySchema.parse(await req.json());
    const trades = await extractTrades(provider, apiKey, text);
    const session = await prisma.llmImportSession.create({
      data: {
        userId: user.id,
        rawInput: text,
        parsedJson: trades,
        status: "DRAFT",
      },
    });
    return NextResponse.json({ sessionId: session.id, trades, provider });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "LLM parse failed" },
      { status: 400 },
    );
  }
}
