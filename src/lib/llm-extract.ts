import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI, SchemaType, FunctionCallingMode } from "@google/generative-ai";
import { z } from "zod";

export const SYSTEM_PROMPT = `You are a trading data parser. Extract every individual trade from the user's input and return them via the \`save_trades\` tool.

Rules:
- Interpret "buy/long/bot" as side=LONG and "sell/short/sld" as side=SHORT for the OPENING side. If the text describes "bought X then sold X", that is ONE long trade with both entry and exit.
- Default instrumentType to "FUTURES" when the symbol looks like a futures contract (ES, NQ, CL, GC, MES, MNQ, etc.), "STOCK" otherwise.
- Use ISO 8601 for timestamps. If only a date is given, use 00:00:00 local. If no date is given, omit the trade rather than guess.
- Convert prices and quantities to numbers. Do NOT invent fees — omit if not stated.
- Return an empty array if no structured trades can be extracted.
- Do not include speculative or partial data. Accuracy over recall.`;

export const tradeSchema = z.object({
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

export type ExtractedTrade = z.infer<typeof tradeSchema>;

function toValidatedTrades(raw: unknown): ExtractedTrade[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((t) => {
      const parsed = tradeSchema.safeParse(t);
      return parsed.success ? parsed.data : null;
    })
    .filter((t): t is ExtractedTrade => t !== null);
}

async function extractWithAnthropic(apiKey: string, text: string): Promise<ExtractedTrade[]> {
  const client = new Anthropic({ apiKey });
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
  if (!toolUse || toolUse.type !== "tool_use") return [];
  const input = toolUse.input as { trades?: unknown[] };
  return toValidatedTrades(input.trades);
}

async function extractWithGoogle(apiKey: string, text: string): Promise<ExtractedTrade[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    tools: [
      {
        functionDeclarations: [
          {
            name: "save_trades",
            description: "Save the extracted trades into the journal.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                trades: {
                  type: SchemaType.ARRAY,
                  items: {
                    type: SchemaType.OBJECT,
                    properties: {
                      symbol: { type: SchemaType.STRING },
                      side: { type: SchemaType.STRING, format: "enum", enum: ["LONG", "SHORT"] },
                      quantity: { type: SchemaType.NUMBER },
                      entryPrice: { type: SchemaType.NUMBER },
                      exitPrice: { type: SchemaType.NUMBER, nullable: true },
                      entryAt: { type: SchemaType.STRING, description: "ISO 8601 timestamp" },
                      exitAt: { type: SchemaType.STRING, nullable: true },
                      fees: { type: SchemaType.NUMBER, nullable: true },
                      instrumentType: {
                        type: SchemaType.STRING,
                        format: "enum",
                        enum: ["FUTURES", "STOCK", "FX", "CRYPTO", "OPTION"],
                      },
                      notes: { type: SchemaType.STRING, nullable: true },
                    },
                    required: ["symbol", "side", "quantity", "entryPrice", "entryAt"],
                  },
                },
              },
              required: ["trades"],
            },
          },
        ],
      },
    ],
    toolConfig: {
      functionCallingConfig: { mode: FunctionCallingMode.ANY, allowedFunctionNames: ["save_trades"] },
    },
  });

  const result = await model.generateContent(text);
  const calls = result.response.functionCalls() ?? [];
  const call = calls.find((c) => c.name === "save_trades");
  if (!call) return [];
  const args = call.args as { trades?: unknown[] };
  return toValidatedTrades(args.trades);
}

export async function extractTrades(
  provider: "ANTHROPIC" | "GOOGLE",
  apiKey: string,
  text: string,
): Promise<ExtractedTrade[]> {
  if (provider === "ANTHROPIC") return extractWithAnthropic(apiKey, text);
  return extractWithGoogle(apiKey, text);
}
