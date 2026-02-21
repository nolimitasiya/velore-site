import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { toMonthStartUTC } from "@/lib/date/month";
import { adminError } from "@/lib/auth/http";
import { normalizeCurrencyCode, isAllowedBrandCurrency } from "@/lib/currency/codes";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireAdminSession();

    const body = await req.json().catch(() => ({}));
    const brandId = String(body.brandId || "").trim();
    const monthRaw = body.month;

    const amountRaw = body.amount;
    const amountStr =
      typeof amountRaw === "string" ? amountRaw.trim() : String(amountRaw ?? "").trim();

    if (!brandId || !monthRaw || !amountStr) {
      return NextResponse.json(
        { ok: false, error: "brandId, month and amount are required" },
        { status: 400 }
      );
    }

    // ✅ Decimal-safe
    const amountNum = Number(amountStr);
    if (!Number.isFinite(amountNum)) {
      return NextResponse.json({ ok: false, error: "amount must be a number" }, { status: 400 });
    }
    const amount = new Prisma.Decimal(amountStr);

    // ✅ currency as string (validated against your allowed list)
    const cur = normalizeCurrencyCode(body.currency);
    const currency = isAllowedBrandCurrency(cur) ? cur : "GBP";

    const reference = body.reference ? String(body.reference) : null;

    const month = toMonthStartUTC(monthRaw);

    const row = await prisma.affiliateEarning.upsert({
      where: { brandId_month: { brandId, month } },
      update: { amount, currency, reference },
      create: { brandId, month, amount, currency, reference },
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
