import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

export type StorefrontFilterOption = {
  value: string;
  label: string;
};

const getCachedColours =
  unstable_cache(
    async () => {
      const colours =
        await prisma.colour.findMany({
          orderBy: {
            name: "asc",
          },
          select: {
            slug: true,
            name: true,
          },
          take: 300,
        });

      return colours.map((colour) => ({
        value: colour.slug,
        label: colour.name.toLowerCase(),
      }));
    },
    ["storefront-colour-options"],
    {
      tags: [
        "storefront-filter-options",
        "storefront-colours",
      ],
    }
  );

const getCachedSizes =
  unstable_cache(
    async () =>
      prisma.size.findMany({
        orderBy: {
          name: "asc",
        },
        select: {
          slug: true,
          name: true,
        },
        take: 500,
      }),
    ["storefront-size-options"],
    {
      tags: [
        "storefront-filter-options",
        "storefront-sizes",
      ],
    }
  );

export async function getStorefrontColours() {
  return getCachedColours();
}

export async function getStorefrontSizes() {
  return getCachedSizes();
}