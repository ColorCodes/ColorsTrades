import { z } from "zod";

const decimalLike = z.union([z.string(), z.number()]).transform((v) => {
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) throw new Error("Invalid number");
  return n;
});

const optionalDecimal = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => {
    if (v == null || v === "") return null;
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isFinite(n) ? n : null;
  });

export const tradeCreateSchema = z.object({
  accountId: z.string().min(1),
  symbol: z.string().min(1).max(32).transform((s) => s.trim().toUpperCase()),
  instrumentType: z.enum(["STOCK", "FUTURES", "FX", "CRYPTO", "OPTION"]).default("FUTURES"),
  side: z.enum(["LONG", "SHORT"]),
  quantity: decimalLike,
  entryPrice: decimalLike,
  exitPrice: optionalDecimal,
  entryAt: z.union([z.string(), z.date()]).transform((v) => new Date(v)),
  exitAt: z
    .union([z.string(), z.date(), z.null()])
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
  fees: optionalDecimal,
  stopLoss: optionalDecimal,
  takeProfit: optionalDecimal,
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional().nullable(),
  source: z.enum(["MANUAL", "CSV", "LLM"]).optional().default("MANUAL"),
});

export type TradeCreateInput = z.infer<typeof tradeCreateSchema>;

export const tradeUpdateSchema = tradeCreateSchema.partial().extend({ id: z.string().min(1).optional() });
export type TradeUpdateInput = z.infer<typeof tradeUpdateSchema>;
