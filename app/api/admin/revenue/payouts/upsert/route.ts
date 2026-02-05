import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { toMonthStartUTC } from "@/lib/date/month";
import { PayoutStatus } from "@prisma/client";
import { adminError } from "@/lib/auth/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireAdminSession();

    const body = await req.json().catch(() => ({}));
    const brandId = String(body.brandId || "").trim();
    const monthRaw = body.month;

    const status: PayoutStatus =
      (Object.values(PayoutStatus) as string[]).includes(String(body.status))
        ? (body.status as PayoutStatus)
        : PayoutStatus.pending;

    const method = body.method ? String(body.method) : null;
    const notes = body.notes ? String(body.notes) : null;

    if (!brandId || !monthRaw) {
      return NextResponse.json(
        { ok: false, error: "brandId and month required" },
        { status: 400 }
      );
    }

    const month = toMonthStartUTC(monthRaw);

    const row = await prisma.brandPayout.upsert({
      where: { brandId_month: { brandId, month } },
      update: { status, method, notes },
      create: { brandId, month, status, method, notes },
    });

    return NextResponse.json({ ok: true, payout: row });
  } catch (e) {
    return adminError(e);
  }
}
