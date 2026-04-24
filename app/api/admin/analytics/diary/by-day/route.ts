import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export async function GET() {
  await requireAdminSession();

  const reads = await prisma.diaryRead.findMany({
    orderBy: { readAt: "asc" },
    select: {
      readAt: true,
    },
  });

  const grouped = new Map<string, number>();

  for (const row of reads) {
    const key = row.readAt.toISOString().slice(0, 10);
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }

  const days = Array.from(grouped.entries()).map(([date, reads]) => ({
    date,
    reads,
  }));

  return NextResponse.json({
    ok: true,
    days,
  });
}