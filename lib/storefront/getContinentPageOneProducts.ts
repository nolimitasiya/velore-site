import { prisma } from "@/lib/prisma";
import type { GridProduct } from "@/components/ProductGrid";
import type { Region } from "@prisma/client";

type CandidateProduct = {
  id: string;
  title: string;
  price: unknown;
  currency: string;
  badges: string[];
  affiliateUrl: string | null;
  publishedAt: Date | null;
  brand: {
    name: string;
    baseCountryCode: string | null;
  } | null;
  images: Array<{
    url: string;
  }>;
};

function mapToGridProduct(
  product: CandidateProduct,
  index: number,
  isExpandedPageOne: boolean
): GridProduct {
  return {
    id: product.id,
    title: product.title,
    brandName: product.brand?.name ?? null,
    imageUrl: product.images[0]?.url ?? null,
    price: product.price == null ? null : String(product.price),
    currency: String(product.currency),
    buyUrl: `/out/${product.id}`,
    badges: (product.badges ?? []) as string[],
    analytics: {
      sourcePage: "SEARCH",
      sectionKey: "continent_grid",
      position: index + 1,
      pageNumber: 1,
      isExpandedPageOne,
      contextType: "BALANCED",
    },
  };
}

export async function getContinentPageOneProducts(
  region: Region,
  visibleCount = 24
): Promise<GridProduct[]> {
  const targetCount = Math.max(1, Math.min(visibleCount, 48));
  const isExpandedPageOne = targetCount > 24;

  const products = await prisma.product.findMany({
    where: {
      status: "APPROVED",
      isActive: true,
      publishedAt: { not: null },
      affiliateUrl: { not: null },
      brand: {
        is: {
          baseRegion: region,
          accountStatus: "ACTIVE",
          affiliateStatus: "ACTIVE",
        },
      },
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: 240,
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      badges: true,
      affiliateUrl: true,
      publishedAt: true,
      brand: {
        select: {
          name: true,
          baseCountryCode: true,
        },
      },
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true },
      },
    },
  });

  const validProducts = products.filter(
    (p) => p.brand?.baseCountryCode && p.affiliateUrl
  ) as CandidateProduct[];

  const byCountry = new Map<string, CandidateProduct[]>();

  for (const product of validProducts) {
    const cc = product.brand?.baseCountryCode?.toUpperCase();
    if (!cc) continue;

    const arr = byCountry.get(cc) ?? [];
    arr.push(product);
    byCountry.set(cc, arr);
  }

  const countryGroups = Array.from(byCountry.entries())
    .map(([countryCode, items]) => ({
      countryCode,
      items,
    }))
    .sort((a, b) => a.countryCode.localeCompare(b.countryCode));

  const countryCount = countryGroups.length;

  if (countryCount < 1) {
    return validProducts
      .slice(0, targetCount)
      .map((product, index) =>
        mapToGridProduct(product, index, isExpandedPageOne)
      );
  }

  const picked: CandidateProduct[] = [];
  const usedIds = new Set<string>();

  // Pass 1: one per country
  for (const group of countryGroups) {
    const next = group.items.find((item) => !usedIds.has(item.id));
    if (!next) continue;

    picked.push(next);
    usedIds.add(next.id);

    if (picked.length >= targetCount) {
      return picked.map((product, index) =>
        mapToGridProduct(product, index, isExpandedPageOne)
      );
    }
  }

  // Pass 2: second pass across countries
  for (const group of countryGroups) {
    const next = group.items.find((item) => !usedIds.has(item.id));
    if (!next) continue;

    picked.push(next);
    usedIds.add(next.id);

    if (picked.length >= targetCount) {
      return picked.map((product, index) =>
        mapToGridProduct(product, index, isExpandedPageOne)
      );
    }
  }

  // Pass 3: fill remaining
  const remaining = countryGroups
    .flatMap((group) => group.items)
    .filter((item) => !usedIds.has(item.id));

  for (const item of remaining) {
    picked.push(item);
    usedIds.add(item.id);

    if (picked.length >= targetCount) break;
  }

  return picked.map((product, index) =>
    mapToGridProduct(product, index, isExpandedPageOne)
  );
}