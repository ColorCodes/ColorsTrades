import { z } from "zod";

const optDec = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => {
    if (v == null || v === "") return null;
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isFinite(n) ? n : null;
  });

const dec = z.union([z.string(), z.number()]).transform((v) => {
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) throw new Error("Invalid number");
  return n;
});

export const accountCreateSchema = z.object({
  name: z.string().min(1).max(120),
  firm: z.string().max(80).optional().nullable(),
  accountNumber: z.string().max(80).optional().nullable(),
  phase: z.enum(["EVAL_1", "EVAL_2", "FUNDED", "BREACHED", "ARCHIVED"]).default("EVAL_1"),
  startingBalance: dec,
  currentBalance: dec.optional(),
  profitTarget: optDec,
  maxDailyLoss: optDec,
  maxTotalLoss: optDec,
  payoutSplit: optDec,
  currency: z.string().default("USD"),
});

export const accountUpdateSchema = accountCreateSchema.partial();

export const transactionCreateSchema = z.object({
  type: z.enum(["DEPOSIT", "WITHDRAWAL", "PAYOUT", "FEE", "SUBSCRIPTION", "RESET", "OTHER"]),
  amount: dec,
  occurredAt: z.union([z.string(), z.date()]).transform((v) => new Date(v)),
  memo: z.string().optional().nullable(),
});
