import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; txId: string }> }) {
  const user = await requireUser();
  const { id, txId } = await params;
  const tx = await prisma.accountTransaction.findFirst({ where: { id: txId, accountId: id, userId: user.id } });
  if (!tx) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.accountTransaction.delete({ where: { id: txId } });
  return NextResponse.json({ ok: true });
}
