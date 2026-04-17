import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ current: z.string().min(1), next: z.string().min(8).max(256) });

export async function POST(req: NextRequest) {
  const user = await requireUser();
  try {
    const { current, next } = bodySchema.parse(await req.json());
    const row = await prisma.user.findUnique({ where: { id: user.id } });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const ok = await bcrypt.compare(current, row.passwordHash);
    if (!ok) return NextResponse.json({ error: "Current password is wrong" }, { status: 400 });
    const passwordHash = await bcrypt.hash(next, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid" }, { status: 400 });
  }
}
