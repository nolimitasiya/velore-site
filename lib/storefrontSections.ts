import { prisma } from "@/lib/prisma";
import { StorefrontSectionType } from "@prisma/client";

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

export async function resolveHomepageStorefrontSection(country?: string | null) {
  const normalizedCountry =
    typeof country === "string" && country.trim().length === 2
      ? country.trim().toUpperCase()
      : null;

  const campaignMatch = await prisma.storefrontSection.findFirst({
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

  if (campaignMatch) {
    return campaignMatch;
  }

  const countryMatch = normalizedCountry
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

  if (countryMatch) {
    return countryMatch;
  }

  const fallback = await prisma.storefrontSection.findFirst({
    where: {
      isActive: true,
      type: StorefrontSectionType.DEFAULT,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: storefrontSectionInclude,
  });

  return fallback;
}