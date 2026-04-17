import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a trading data parser. Extract every individual trade from the user's input and return them via the \`save_trades\` tool.

Rules:
- Interpret "buy/long/bot" as side=LONG and "sell/short/sld" as side=SHORT for the OPENING side. If the text describes "bought X then sold X", that is ONE long trade with both entry and exit.
- Default instrumentType to "FUTURES" when the symbol looks like a futures contract (ES, NQ, CL, GC, MES, MNQ, etc.), "STOCK" otherwise.
- Use ISO 8601 for timestamps. If only a date is given, use 00:00:00 local. If no date is given, omit the trade rather than guess.
- Convert prices and quantities to numbers. Do NOT invent fees — omit if not stated.
- Return an empty array if no structured trades can be extracted.
- Do not include speculative or partial data. Accuracy over recall.`;

const tradeSchema = z.object({
  symbol: z.string().min(1),
  side: z.enum(["LONG", "SHORT"]),
  quantity: z.number().positive(),
  entryPrice: z.number(),
  exitPrice: z.number().optional().nullable(),
  entryAt: z.string(),
  exitAt: z.string().optional().nullable(),
  fees: z.number().optional().nullable(),
  instrumentType: z.enum(["FUTURES", "STOCK", "FX", "CRYPTO", "OPTION"]).optional(),
  notes: z.string().optional().nullable(),
});

const bodySchema = z.object({ text: z.string().min(1).max(50_000) });

export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 503 });
  }

  try {
    const { text } = bodySchema.parse(await req.json());
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: "save_trades",
          description: "Save the extracted trades into the journal.",
          input_schema: {
            type: "object",
            properties: {
              trades: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    symbol: { type: "string" },
                    side: { type: "string", enum: ["LONG", "SHORT"] },
                    quantity: { type: "number" },
                    entryPrice: { type: "number" },
                    exitPrice: { type: ["number", "null"] },
                    entryAt: { type: "string", description: "ISO 8601 timestamp" },
                    exitAt: { type: ["string", "null"] },
                    fees: { type: ["number", "null"] },
                    instrumentType: { type: "string", enum: ["FUTURES", "STOCK", "FX", "CRYPTO", "OPTION"] },
                    notes: { type: ["string", "null"] },
                  },
                  required: ["symbol", "side", "quantity", "entryPrice", "entryAt"],
                },
              },
            },
            required: ["trades"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "save_trades" },
      messages: [{ role: "user", content: text }],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    let trades: z.infer<typeof tradeSchema>[] = [];
    if (toolUse && toolUse.type === "tool_use") {
      const input = toolUse.input as { trades?: unknown[] };
      const arr = Array.isArray(input.trades) ? input.trades : [];
      trades = arr
        .map((t) => {
          const parsed = tradeSchema.safeParse(t);
          return parsed.success ? parsed.data : null;
        })
        .filter((t): t is z.infer<typeof tradeSchema> => t !== null);
    }

    const session = await prisma.llmImportSession.create({
      data: {
        userId: user.id,
        rawInput: text,
        parsedJson: trades,
        status: "DRAFT",
      },
    });

    return NextResponse.json({ sessionId: session.id, trades });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "LLM parse failed" }, { status: 400 });
  }
}
