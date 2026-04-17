import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { journalCreateSchema } from "@/lib/schemas/journal";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  const entries = await prisma.journalEntry.findMany({ where: { userId: user.id }, orderBy: { date: "desc" } });
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  try {
    const data = journalCreateSchema.parse(await req.json());
    const entry = await prisma.journalEntry.create({
      data: {
        userId: user.id,
        date: data.date,
        title: data.title,
        bodyMarkdown: data.bodyMarkdown ?? "",
        mood: data.mood ?? null,
        tagsJson: data.tags ?? [],
      },
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid" }, { status: 400 });
  }
}
