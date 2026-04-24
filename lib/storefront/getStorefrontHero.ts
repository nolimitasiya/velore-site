import { prisma } from "@/lib/prisma";
import type { StorefrontHeroData } from "@/components/Hero";

const DEFAULT_HERO = {
  title: "Discover modest fashion from around the world",
  subtitle: "Curated pieces for work, occasion, everyday and beyond.",
  desktopImageUrl: "/images/hero.jpg",
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

export async function getStorefrontHero(): Promise<StorefrontHeroData> {
  let hero = await prisma.storefrontHero.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });

  if (!hero) {
    hero = await prisma.storefrontHero.create({
      data: DEFAULT_HERO,
    });
  }

  return {
    id: hero.id,
    title: hero.title,
    subtitle: hero.subtitle,
    desktopImageUrl: hero.desktopImageUrl,
    mobileImageUrl: hero.mobileImageUrl,
    ctaLabel: hero.ctaLabel,
    ctaHref: hero.ctaHref,
    overlayOpacity: hero.overlayOpacity,
    focalX: hero.focalX,
    focalY: hero.focalY,
    textAlign:
      hero.textAlign === "LEFT" ||
      hero.textAlign === "CENTER" ||
      hero.textAlign === "RIGHT"
        ? hero.textAlign
        : "LEFT",
    textX: hero.textX ?? 20,
    textY: hero.textY ?? 62,
    isActive: hero.isActive,
  };
}