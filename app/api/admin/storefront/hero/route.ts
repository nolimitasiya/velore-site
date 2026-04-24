import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_HERO = {
  title: "Discover modest fashion from around the world",
  subtitle: "Curated pieces for work, occasion, everyday and beyond.",
  desktopImageUrl: "/images/hero.jpg", // replace with your real default image if needed
  mobileImageUrl: null,
  ctaLabel: "Shop now",
  ctaHref: "/new-in",
  overlayOpacity: 20,
  focalX: 50,
  focalY: 50,
  textAlign: "LEFT" as const,
  textX: 20,
  textY: 62,
  isActive: true,
};

function clampNumber(value: unknown, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, num));
}

function normalizeOptionalString(value: unknown) {
  const str = String(value ?? "").trim();
  return str ? str : null;
}

function normalizeTextAlign(value: unknown): "LEFT" | "CENTER" | "RIGHT" {
  return value === "CENTER" || value === "RIGHT" ? value : "LEFT";
}

async function ensureHero() {
  let hero = await prisma.storefrontHero.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!hero) {
    hero = await prisma.storefrontHero.create({
      data: DEFAULT_HERO,
    });
  }

  return hero;
}

export async function GET() {
  await requireAdminSession();

  const hero = await ensureHero();
  return NextResponse.json(hero);
}

export async function PATCH(req: NextRequest) {
  await requireAdminSession();

  const existing = await ensureHero();
  const body = await req.json();

  const desktopImageUrl = String(body.desktopImageUrl ?? "").trim();

  const hero = await prisma.storefrontHero.update({
    where: { id: existing.id },
    data: {
      title: normalizeOptionalString(body.title),
      subtitle: normalizeOptionalString(body.subtitle),
      desktopImageUrl: desktopImageUrl || existing.desktopImageUrl,
      mobileImageUrl: normalizeOptionalString(body.mobileImageUrl),
      ctaLabel: normalizeOptionalString(body.ctaLabel),
      ctaHref: normalizeOptionalString(body.ctaHref),
      overlayOpacity: clampNumber(body.overlayOpacity, 20),
      focalX: clampNumber(body.focalX, 50),
      focalY: clampNumber(body.focalY, 50),
      textAlign: normalizeTextAlign(body.textAlign),
      textX: clampNumber(body.textX, 20),
      textY: clampNumber(body.textY, 62),
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
    },
  });

  return NextResponse.json(hero);
}