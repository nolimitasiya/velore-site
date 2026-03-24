import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeUrl(value: unknown) {
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

function normalizePercent(value: unknown, fallback = 50) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, num));
}

export async function GET() {
  try {
    const { brandId } = await requireBrandContext();

    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: {
        id: true,
        name: true,
        slug: true,
        coverImageUrl: true,
        coverImageFocalX: true,
        coverImageFocalY: true,
        baseCity: true,
        baseCountryCode: true,
        baseRegion: true,
      },
    });

    if (!brand) {
      return NextResponse.json({ ok: false, error: "Brand not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, brand });
  } catch {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const { brandId } = await requireBrandContext();
    const body = await req.json().catch(() => ({}));

    const coverImageUrl =
      body.coverImageUrl === "" || body.coverImageUrl == null
        ? null
        : normalizeUrl(body.coverImageUrl);

    if (body.coverImageUrl && !coverImageUrl) {
      return NextResponse.json(
        { ok: false, error: "Please enter a valid http/https image URL." },
        { status: 400 }
      );
    }

    const coverImageFocalX = normalizePercent(body.coverImageFocalX, 50);
    const coverImageFocalY = normalizePercent(body.coverImageFocalY, 50);

    const brand = await prisma.brand.update({
      where: { id: brandId },
      data: {
        coverImageUrl,
        coverImageFocalX,
        coverImageFocalY,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        coverImageUrl: true,
        coverImageFocalX: true,
        coverImageFocalY: true,
      },
    });

    return NextResponse.json({ ok: true, brand });
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to save profile." }, { status: 500 });
  }
}