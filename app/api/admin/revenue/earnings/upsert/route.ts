import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { toMonthStartUTC } from "@/lib/date/month";
import { Currency } from "@prisma/client";
import { adminError } from "@/lib/auth/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireAdminSession();

    const body = await req.json().catch(() => ({}));
    const brandId = String(body.brandId || "").trim();
    const monthRaw = body.month;

    // amount can come as number or string
    const amountRaw = body.amount;
    const amount = typeof amountRaw === "string" ? amountRaw.trim() : String(amountRaw ?? "").trim();

    const currency: Currency =
      (Object.values(Currency) as string[]).includes(String(body.currency))
        ? (body.currency as Currency)
        : Currency.GBP;

    const reference = body.reference ? String(body.reference) : null;

    if (!brandId || !monthRaw || !amount) {
      return NextResponse.json(
        { ok: false, error: "brandId, month and amount are required" },
        { status: 400 }
      );
    }

    // optional: basic numeric validation
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum)) {
      return NextResponse.json({ ok: false, error: "amount must be a number" }, { status: 400 });
    }

    const month = toMonthStartUTC(monthRaw);

    const row = await prisma.affiliateEarning.upsert({
      where: { brandId_month: { brandId, month } },
      update: { amount: amountNum, currency, reference },
      create: { brandId, month, amount: amountNum, currency, reference },
      select: {
        id: true,
        brandId: true,
        month: true,
        amount: true,
        currency: true,
        reference: true,
        createdAt: true,
        updatedAt: true,
        brand: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json({ ok: true, earning: row });
    } catch (e) {
    return adminError(e);
  }
}
