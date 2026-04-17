import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { journalUpdateSchema } from "@/lib/schemas/journal";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const entry = await prisma.journalEntry.findFirst({ where: { id, userId: user.id } });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ entry });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  try {
    const data = journalUpdateSchema.parse(await req.json());
    const existing = await prisma.journalEntry.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const entry = await prisma.journalEntry.update({
      where: { id },
      data: {
        ...(data.date !== undefined ? { date: data.date } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.bodyMarkdown !== undefined ? { bodyMarkdown: data.bodyMarkdown } : {}),
        ...(data.mood !== undefined ? { mood: data.mood } : {}),
        ...(data.tags !== undefined ? { tagsJson: data.tags } : {}),
      },
    });
    return NextResponse.json({ entry });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const existing = await prisma.journalEntry.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.journalEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
