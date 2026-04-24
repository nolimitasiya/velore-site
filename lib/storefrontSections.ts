import { prisma } from "@/lib/prisma";
import {
  AffiliateStatus,
  BrandAccountStatus,
  ProductStatus,
  StorefrontSectionType,
} from "@prisma/client";


const storefrontSectionInclude = {
  items: {
    orderBy: { position: "asc" as const },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          price: true,
          currency: true,
          affiliateUrl: true,
          sourceUrl: true,
          publishedAt: true,
          isActive: true,
          status: true,
          brand: {
            select: {
              name: true,
              affiliateBaseUrl: true,
              accountStatus: true,
              affiliateStatus: true,
            },
          },
          images: {
            orderBy: { sortOrder: "asc" as const },
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  },
  campaignCountries: {
    select: {
      countryCode: true,
    },
  },
};

function isPubliclyShoppableProduct(
  item: {
    product: {
      publishedAt: Date | null;
      isActive: boolean;
      status: ProductStatus;
      brand: {
        accountStatus: BrandAccountStatus;
        affiliateStatus: AffiliateStatus;
      } | null;
    } | null;
  }
) {
  const product = item.product;
  if (!product) return false;

  return (
    product.status === ProductStatus.APPROVED &&
    product.isActive === true &&
    product.publishedAt != null &&
    product.brand?.accountStatus === BrandAccountStatus.ACTIVE &&
    product.brand?.affiliateStatus === AffiliateStatus.ACTIVE
  );
}

function trimSectionItems<T extends { items: any[]; maxItems: number }>(section: T | null) {
  if (!section) return null;

  const eligibleItems = section.items
    .filter(isPubliclyShoppableProduct)
    .slice(0, section.maxItems);

  return {
    ...section,
    items: eligibleItems,
  };
}

export async function resolveHomepageStorefrontSection(country?: string | null) {
  const normalizedCountry =
    typeof country === "string" && country.trim().length === 2
      ? country.trim().toUpperCase()
      : null;

  const campaignMatchRaw = await prisma.storefrontSection.findFirst({
    where: {
      isActive: true,
      type: StorefrontSectionType.CAMPAIGN,
      OR: [
        { campaignAppliesToAllCountries: true },
        ...(normalizedCountry
          ? [
              {
                campaignAppliesToAllCountries: false,
                campaignCountries: {
                  some: {
                    countryCode: normalizedCountry,
                  },
                },
              },
            ]
          : []),
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: storefrontSectionInclude,
  });

  const campaignMatch = trimSectionItems(campaignMatchRaw);
  if (campaignMatch && campaignMatch.items.length > 0) {
    return campaignMatch;
  }

  const countryMatchRaw = normalizedCountry
    ? await prisma.storefrontSection.findFirst({
        where: {
          isActive: true,
          type: StorefrontSectionType.COUNTRY,
          targetCountryCode: normalizedCountry,
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: storefrontSectionInclude,
      })
    : null;

  const countryMatch = trimSectionItems(countryMatchRaw);
  if (countryMatch && countryMatch.items.length > 0) {
    return countryMatch;
  }

  const fallbackRaw = await prisma.storefrontSection.findFirst({
    where: {
      isActive: true,
      type: StorefrontSectionType.DEFAULT,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: storefrontSectionInclude,
  });

  return trimSectionItems(fallbackRaw);
}