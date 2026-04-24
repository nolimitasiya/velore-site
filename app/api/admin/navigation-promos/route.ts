import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapPromo(promo: {
  id: string;
  key: string;
  title: string;
  kicker: string | null;
  blurb: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: promo.id,
    key: promo.key,
    title: promo.title,
    kicker: promo.kicker,
    blurb: promo.blurb,
    imageUrl: promo.imageUrl,
    ctaLabel: promo.ctaLabel,
    ctaHref: promo.ctaHref,
    isActive: promo.isActive,
    createdAt: promo.createdAt.toISOString(),
    updatedAt: promo.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    await requireAdminSession();

    const promos = await prisma.navigationPromo.findMany({
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      ok: true,
      promos: promos.map(mapPromo),
    });
  } catch (error) {
    console.error("GET /api/admin/navigation-promos failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to load navigation promos" },
      { status: 500 }
    );
  }
}