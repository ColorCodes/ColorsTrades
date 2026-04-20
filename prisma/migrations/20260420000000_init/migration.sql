-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PropFirmPhase" AS ENUM ('EVAL_1', 'EVAL_2', 'FUNDED', 'BREACHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InstrumentType" AS ENUM ('STOCK', 'FUTURES', 'FX', 'CRYPTO', 'OPTION');

-- CreateEnum
CREATE TYPE "TradeSide" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "TradeSource" AS ENUM ('MANUAL', 'CSV', 'LLM');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'PAYOUT', 'FEE', 'SUBSCRIPTION', 'RESET', 'OTHER');

-- CreateEnum
CREATE TYPE "LlmImportStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "LlmProvider" AS ENUM ('ANTHROPIC', 'GOOGLE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "activeLlmProvider" "LlmProvider",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "LlmProvider" NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "lastFour" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropFirmAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firm" TEXT,
    "accountNumber" TEXT,
    "phase" "PropFirmPhase" NOT NULL DEFAULT 'EVAL_1',
    "startingBalance" DECIMAL(18,6) NOT NULL,
    "currentBalance" DECIMAL(18,6) NOT NULL,
    "profitTarget" DECIMAL(18,6),
    "maxDailyLoss" DECIMAL(18,6),
    "maxTotalLoss" DECIMAL(18,6),
    "payoutSplit" DECIMAL(5,4),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "PropFirmAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "instrumentType" "InstrumentType" NOT NULL DEFAULT 'FUTURES',
    "side" "TradeSide" NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "entryPrice" DECIMAL(18,6) NOT NULL,
    "exitPrice" DECIMAL(18,6),
    "entryAt" TIMESTAMP(3) NOT NULL,
    "exitAt" TIMESTAMP(3),
    "fees" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "grossPnl" DECIMAL(18,6),
    "netPnl" DECIMAL(18,6),
    "rMultiple" DECIMAL(10,4),
    "stopLoss" DECIMAL(18,6),
    "takeProfit" DECIMAL(18,6),
    "status" "TradeStatus" NOT NULL DEFAULT 'OPEN',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "source" "TradeSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(18,6) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Playbook" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rulesJson" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Playbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "mood" TEXT,
    "tagsJson" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CsvImportPreset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "delimiter" TEXT NOT NULL DEFAULT ',',
    "dateFormat" TEXT NOT NULL DEFAULT 'yyyy-MM-dd HH:mm:ss',
    "mappingJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CsvImportPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmImportSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rawInput" TEXT NOT NULL,
    "parsedJson" JSONB NOT NULL,
    "status" "LlmImportStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LlmImportSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LlmApiKey_userId_provider_key" ON "LlmApiKey"("userId", "provider");

-- CreateIndex
CREATE INDEX "PropFirmAccount_userId_idx" ON "PropFirmAccount"("userId");

-- CreateIndex
CREATE INDEX "Trade_userId_entryAt_idx" ON "Trade"("userId", "entryAt");

-- CreateIndex
CREATE INDEX "Trade_accountId_entryAt_idx" ON "Trade"("accountId", "entryAt");

-- CreateIndex
CREATE INDEX "AccountTransaction_userId_occurredAt_idx" ON "AccountTransaction"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "AccountTransaction_accountId_occurredAt_idx" ON "AccountTransaction"("accountId", "occurredAt");

-- CreateIndex
CREATE INDEX "Playbook_userId_idx" ON "Playbook"("userId");

-- CreateIndex
CREATE INDEX "JournalEntry_userId_date_idx" ON "JournalEntry"("userId", "date");

-- CreateIndex
CREATE INDEX "CsvImportPreset_userId_idx" ON "CsvImportPreset"("userId");

-- CreateIndex
CREATE INDEX "LlmImportSession_userId_createdAt_idx" ON "LlmImportSession"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "LlmApiKey" ADD CONSTRAINT "LlmApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropFirmAccount" ADD CONSTRAINT "PropFirmAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PropFirmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTransaction" ADD CONSTRAINT "AccountTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountTransaction" ADD CONSTRAINT "AccountTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PropFirmAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CsvImportPreset" ADD CONSTRAINT "CsvImportPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmImportSession" ADD CONSTRAINT "LlmImportSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

