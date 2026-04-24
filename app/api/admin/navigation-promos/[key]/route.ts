import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { NavigationPromoKey } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type UpdatePayload = {
  title?: string;
  kicker?: string | null;
  blurb?: string | null;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  isActive?: boolean;
};

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parsePromoKey(value: string): NavigationPromoKey | null {
  if (
    value === "CLOTHING" ||
    value === "ACCESSORIES" ||
    value === "OCCASION" ||
    value === "NEW_IN" ||
    value === "SHOP_BY_BRANDS" ||
    value === "EDITORIAL" ||
    value === "SALE"
  ) {
    return value;
  }

  return null;
}

function defaultHrefForKey(key: NavigationPromoKey): string {
  switch (key) {
    case "CLOTHING":
      return "/categories/clothing";
      case "ACCESSORIES":
      return "/categories/accessories";
    case "OCCASION":
      return "/categories/occasion";
    case "NEW_IN":
      return "/new-in";
    case "SHOP_BY_BRANDS":
      return "/brands";
    case "EDITORIAL":
      return "/diary";
    case "SALE":
      return "/sale";
    default:
      return "/";
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ key: string }> }
) {
  try {
    await requireAdminSession();

    const { key: rawKey } = await params;
    const key = parsePromoKey(String(rawKey).trim().toUpperCase());

    if (!key) {
      return NextResponse.json(
        { ok: false, error: "Invalid navigation promo key" },
        { status: 400 }
      );
    }

    const body = (await req.json()) as UpdatePayload;

    const title = String(body.title ?? "").trim();
    if (!title) {
      return NextResponse.json(
        { ok: false, error: "Title is required" },
        { status: 400 }
      );
    }

    const kicker = normalizeOptionalString(body.kicker);
    const blurb = normalizeOptionalString(body.blurb);
    const imageUrl = normalizeOptionalString(body.imageUrl);
    const ctaLabel = normalizeOptionalString(body.ctaLabel);
    const ctaHref = normalizeOptionalString(body.ctaHref) ?? defaultHrefForKey(key);
    const isActive = body.isActive ?? true;

    const promo = await prisma.navigationPromo.upsert({
      where: { key },
      update: {
        title,
        kicker,
        blurb,
        imageUrl,
        ctaLabel,
        ctaHref,
        isActive,
      },
      create: {
        key,
        title,
        kicker,
        blurb,
        imageUrl,
        ctaLabel,
        ctaHref,
        isActive,
      },
    });

    return NextResponse.json({
      ok: true,
      promo: {
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
      },
    });
  } catch (error) {
    console.error("POST /api/admin/navigation-promos/[key] failed:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to save navigation promo" },
      { status: 500 }
    );
  }
}