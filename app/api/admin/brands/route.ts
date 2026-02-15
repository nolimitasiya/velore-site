import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdminSession();

  const brands = await prisma.brand.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      accountStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionStatus: true,
      currentPeriodEnd: true,
      pastDueSince: true,
    },
  });

  return NextResponse.json({ ok: true, brands });
}
