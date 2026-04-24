import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeAffiliateUrl(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminSession();
    const { id } = await context.params;

    const body = await req.json().catch(() => ({}));
    const affiliateUrl = normalizeAffiliateUrl(body.affiliateUrl);

    if (body.affiliateUrl && !affiliateUrl) {
      return NextResponse.json(
        { ok: false, error: "Invalid affiliate URL" },
        { status: 400 }
      );
    }

    const product = await prisma.product.update({
      where: { id },
      data: { affiliateUrl },
      select: {
        id: true,
        affiliateUrl: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, product });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to save affiliate URL" },
      { status: e?.message === "UNAUTHENTICATED" ? 401 : 500 }
    );
  }
}