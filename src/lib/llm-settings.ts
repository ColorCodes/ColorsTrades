import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import type { LlmProvider } from "@prisma/client";

export type LlmProviderStatus = {
  configured: boolean;
  lastFour: string | null;
  updatedAt: string | null;
};

export type LlmSettingsState = {
  activeProvider: LlmProvider | null;
  providers: Record<LlmProvider, LlmProviderStatus>;
};

export async function getLlmSettingsState(userId: string): Promise<LlmSettingsState> {
  const [user, keys] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { activeLlmProvider: true } }),
    prisma.llmApiKey.findMany({
      where: { userId },
      select: { provider: true, lastFour: true, updatedAt: true },
    }),
  ]);

  const byProvider: Record<LlmProvider, LlmProviderStatus> = {
    ANTHROPIC: { configured: false, lastFour: null, updatedAt: null },
    GOOGLE: { configured: false, lastFour: null, updatedAt: null },
  };
  for (const k of keys) {
    byProvider[k.provider] = {
      configured: true,
      lastFour: k.lastFour,
      updatedAt: k.updatedAt.toISOString(),
    };
  }

  return {
    activeProvider: user?.activeLlmProvider ?? null,
    providers: byProvider,
  };
}

export async function getDecryptedApiKey(userId: string, provider: LlmProvider): Promise<string | null> {
  const row = await prisma.llmApiKey.findUnique({
    where: { userId_provider: { userId, provider } },
  });
  if (!row) return null;
  return decryptSecret({ ciphertext: row.ciphertext, iv: row.iv, authTag: row.authTag });
}
