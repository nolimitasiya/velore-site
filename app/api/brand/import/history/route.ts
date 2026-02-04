// app/api/brand/import/history/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandSession } from "@/lib/auth/BrandSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { brandId } = await requireBrandSession();

  const jobs = await prisma.importJob.findMany({
    where: { brandId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ ok: true, jobs });
}
