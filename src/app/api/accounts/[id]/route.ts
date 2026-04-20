import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { accountUpdateSchema } from "@/lib/schemas/account";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const account = await prisma.propFirmAccount.findFirst({ where: { id, userId: user.id } });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ account });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  try {
    const data = accountUpdateSchema.parse(await req.json());
    const existing = await prisma.propFirmAccount.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const account = await prisma.propFirmAccount.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.firm !== undefined ? { firm: data.firm ?? null } : {}),
        ...(data.accountNumber !== undefined ? { accountNumber: data.accountNumber ?? null } : {}),
        ...(data.phase !== undefined ? { phase: data.phase } : {}),
        ...(data.startingBalance !== undefined ? { startingBalance: data.startingBalance } : {}),
        ...(data.currentBalance !== undefined ? { currentBalance: data.currentBalance } : {}),
        ...(data.profitTarget !== undefined ? { profitTarget: data.profitTarget } : {}),
        ...(data.maxDailyLoss !== undefined ? { maxDailyLoss: data.maxDailyLoss } : {}),
        ...(data.maxTotalLoss !== undefined ? { maxTotalLoss: data.maxTotalLoss } : {}),
        ...(data.payoutSplit !== undefined ? { payoutSplit: data.payoutSplit } : {}),
        ...(data.currency !== undefined ? { currency: data.currency } : {}),
      },
    });
    return NextResponse.json({ account });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const existing = await prisma.propFirmAccount.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const mode = new URL(req.url).searchParams.get("mode");
  if (mode === "archive") {
    await prisma.propFirmAccount.update({ where: { id }, data: { archivedAt: new Date(), phase: "ARCHIVED" } });
  } else {
    await prisma.propFirmAccount.delete({ where: { id } });
  }
  return NextResponse.json({ ok: true });
}
