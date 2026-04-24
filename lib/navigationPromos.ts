import { prisma } from "@/lib/prisma";
import { NavigationPromoKey } from "@prisma/client";

export type HeaderPromo = {
  key: NavigationPromoKey;
  title: string;
  kicker: string | null;
  blurb: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  isActive: boolean;
};

type HeaderPromoMap = Record<NavigationPromoKey, HeaderPromo>;

const DEFAULT_PROMOS: HeaderPromoMap = {
  CLOTHING: {
    key: "CLOTHING",
    title: "Modern modest essentials",
    kicker: "Veilora Edit",
    blurb:
      "Discover refined modest pieces curated across global brands, from elevated essentials to statement silhouettes.",
    imageUrl: null,
    ctaLabel: "View all clothing",
    ctaHref: "/categories/clothing",
    isActive: true,
  },

    ACCESSORIES: {
    key: "ACCESSORIES",
    title: "Finishing pieces with intention",
    kicker: "Accessories Edit",
    blurb:
      "Discover curated accessories designed to complement modest dressing with polish and ease.",
    imageUrl: null,
    ctaLabel: "Shop accessories",
    ctaHref: "/categories/accessories",
    isActive: true,
  },
  
  OCCASION: {
    key: "OCCASION",
    title: "Dressing for every moment",
    kicker: "Occasion Edit",
    blurb:
      "Explore occasion-led dressing across curated edits, from everyday polish to wedding, Eid, and evening dressing.",
    imageUrl: null,
    ctaLabel: "View all occasions",
    ctaHref: "/categories/occasion",
    isActive: true,
  },
  NEW_IN: {
    key: "NEW_IN",
    title: "Fresh arrivals, thoughtfully selected",
    kicker: "New In",
    blurb:
      "Stay close to the newest modestwear arrivals across the Veilora edit.",
    imageUrl: null,
    ctaLabel: "Shop new in",
    ctaHref: "/new-in",
    isActive: true,
  },
  SHOP_BY_BRANDS: {
    key: "SHOP_BY_BRANDS",
    title: "Discover brands with a point of view",
    kicker: "Brand Edit",
    blurb:
      "Browse a curated mix of global modest brands, each bringing its own distinct identity.",
    imageUrl: null,
    ctaLabel: "Shop by brands",
    ctaHref: "/brands",
    isActive: true,
  },
  EDITORIAL: {
    key: "EDITORIAL",
    title: "Stories, style notes, and thoughtful edits",
    kicker: "Editorial",
    blurb:
      "Explore the Veilora editorial space for diary entries, modest style inspiration, and curated features.",
    imageUrl: null,
    ctaLabel: "View editorial",
    ctaHref: "/diary",
    isActive: true,
  },
  SALE: {
    key: "SALE",
    title: "Refined pieces at considered prices",
    kicker: "Sale Edit",
    blurb:
      "Explore reduced styles across the Veilora edit without compromising on elegance.",
    imageUrl: null,
    ctaLabel: "Shop sale",
    ctaHref: "/sale",
    isActive: true,
  },
  
};

export async function getHeaderPromos() {
  const promos = await prisma.navigationPromo.findMany();

  const map: HeaderPromoMap = { ...DEFAULT_PROMOS };

  for (const promo of promos) {
    map[promo.key] = {
      key: promo.key,
      title: promo.title,
      kicker: promo.kicker,
      blurb: promo.blurb,
      imageUrl: promo.imageUrl,
      ctaLabel: promo.ctaLabel,
      ctaHref: promo.ctaHref,
      isActive: promo.isActive,
    };
  }

  return map;
}

export async function getHeaderBrandNavItems() {
  const brands = await prisma.brand.findMany({
    where: {
      products: {
        some: {
          status: "APPROVED",
          isActive: true,
          publishedAt: { not: null },
        },
      },
    },
    orderBy: { name: "asc" },
    take: 12,
    select: {
      name: true,
      slug: true,
    },
  });

  return brands.map((b) => ({
    label: b.name,
    href: `/brands/${b.slug}`,
  }));
}