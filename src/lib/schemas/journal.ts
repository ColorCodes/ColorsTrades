import { z } from "zod";

export const journalCreateSchema = z.object({
  date: z.union([z.string(), z.date()]).transform((v) => new Date(v)),
  title: z.string().min(1).max(200),
  bodyMarkdown: z.string().default(""),
  mood: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
});

export const journalUpdateSchema = journalCreateSchema.partial();
