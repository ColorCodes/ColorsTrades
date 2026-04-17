import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { accountCreateSchema } from "@/lib/schemas/account";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  const accounts = await prisma.propFirmAccount.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  try {
    const data = accountCreateSchema.parse(await req.json());
    const account = await prisma.propFirmAccount.create({
      data: {
        userId: user.id,
        name: data.name,
        firm: data.firm ?? null,
        accountNumber: data.accountNumber ?? null,
        phase: data.phase,
        startingBalance: data.startingBalance,
        currentBalance: data.currentBalance ?? data.startingBalance,
        profitTarget: data.profitTarget,
        maxDailyLoss: data.maxDailyLoss,
        maxTotalLoss: data.maxTotalLoss,
        payoutSplit: data.payoutSplit,
        currency: data.currency,
      },
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid" }, { status: 400 });
  }
}
