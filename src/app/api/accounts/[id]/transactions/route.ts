import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { transactionCreateSchema } from "@/lib/schemas/account";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const account = await prisma.propFirmAccount.findFirst({ where: { id, userId: user.id } });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const transactions = await prisma.accountTransaction.findMany({
    where: { accountId: id, userId: user.id },
    orderBy: { occurredAt: "desc" },
  });
  return NextResponse.json({ transactions });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const account = await prisma.propFirmAccount.findFirst({ where: { id, userId: user.id } });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const data = transactionCreateSchema.parse(await req.json());
    const tx = await prisma.accountTransaction.create({
      data: {
        userId: user.id,
        accountId: id,
        type: data.type,
        amount: data.amount,
        occurredAt: data.occurredAt,
        memo: data.memo ?? null,
      },
    });
    return NextResponse.json({ transaction: tx }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid" }, { status: 400 });
  }
}
