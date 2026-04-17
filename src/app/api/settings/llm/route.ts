import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { encryptSecret, maskLastFour } from "@/lib/crypto";
import { getLlmSettingsState } from "@/lib/llm-settings";

export const dynamic = "force-dynamic";

const providerEnum = z.enum(["ANTHROPIC", "GOOGLE"]);

const saveKeySchema = z.object({
  action: z.literal("saveKey"),
  provider: providerEnum,
  apiKey: z.string().min(10).max(500),
});

const removeKeySchema = z.object({
  action: z.literal("removeKey"),
  provider: providerEnum,
});

const setActiveSchema = z.object({
  action: z.literal("setActive"),
  provider: providerEnum.nullable(),
});

const bodySchema = z.discriminatedUnion("action", [saveKeySchema, removeKeySchema, setActiveSchema]);

export async function GET() {
  const user = await requireUser();
  const state = await getLlmSettingsState(user.id);
  return NextResponse.json(state);
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!process.env.ENCRYPTION_KEY) {
    return NextResponse.json({ error: "ENCRYPTION_KEY is not set on the server" }, { status: 503 });
  }
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid request" }, { status: 400 });
  }

  if (parsed.action === "saveKey") {
    const key = parsed.apiKey.trim();
    const enc = encryptSecret(key);
    await prisma.llmApiKey.upsert({
      where: { userId_provider: { userId: user.id, provider: parsed.provider } },
      create: {
        userId: user.id,
        provider: parsed.provider,
        ciphertext: enc.ciphertext,
        iv: enc.iv,
        authTag: enc.authTag,
        lastFour: maskLastFour(key),
      },
      update: {
        ciphertext: enc.ciphertext,
        iv: enc.iv,
        authTag: enc.authTag,
        lastFour: maskLastFour(key),
      },
    });
    const current = await prisma.user.findUnique({ where: { id: user.id }, select: { activeLlmProvider: true } });
    if (!current?.activeLlmProvider) {
      await prisma.user.update({ where: { id: user.id }, data: { activeLlmProvider: parsed.provider } });
    }
  } else if (parsed.action === "removeKey") {
    await prisma.llmApiKey.deleteMany({ where: { userId: user.id, provider: parsed.provider } });
    const current = await prisma.user.findUnique({ where: { id: user.id }, select: { activeLlmProvider: true } });
    if (current?.activeLlmProvider === parsed.provider) {
      await prisma.user.update({ where: { id: user.id }, data: { activeLlmProvider: null } });
    }
  } else if (parsed.action === "setActive") {
    if (parsed.provider) {
      const key = await prisma.llmApiKey.findUnique({
        where: { userId_provider: { userId: user.id, provider: parsed.provider } },
      });
      if (!key) {
        return NextResponse.json(
          { error: `No ${parsed.provider} key configured. Save a key first.` },
          { status: 400 },
        );
      }
    }
    await prisma.user.update({ where: { id: user.id }, data: { activeLlmProvider: parsed.provider } });
  }

  return NextResponse.json(await getLlmSettingsState(user.id));
}
