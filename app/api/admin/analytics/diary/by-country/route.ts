import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export async function GET() {
  await requireAdminSession();

  const reads = await prisma.diaryRead.findMany({
    select: {
      shopperCountryCode: true,
    },
  });

  const grouped = new Map<string, number>();

  for (const row of reads) {
    const code = String(row.shopperCountryCode || "UNKNOWN").toUpperCase();
    grouped.set(code, (grouped.get(code) ?? 0) + 1);
  }

  const countries = Array.from(grouped.entries())
    .map(([countryCode, reads]) => ({
      countryCode,
      reads,
    }))
    .sort((a, b) => b.reads - a.reads);

  return NextResponse.json({
    ok: true,
    countries,
  });
}