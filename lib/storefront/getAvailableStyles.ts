import { prisma } from "@/lib/prisma";
import { ProductType } from "@prisma/client";
import { unstable_cache } from "next/cache";

export type StyleOption = {
  value: string;
  label: string;
};

function uniqueByValue<T extends { value: string }>(
  items: T[]
): T[] {
  return Array.from(
    new Map(
      items.map((item) => [
        item.value,
        item,
      ])
    ).values()
  );
}

async function fetchAvailableStyles(
  selectedTypes: ProductType[]
): Promise<StyleOption[]> {
  if (!selectedTypes.length) {
    const allStyles =
      await prisma.style.findMany({
        orderBy: {
          name: "asc",
        },
        select: {
          slug: true,
          name: true,
        },
        take: 500,
      });

    return allStyles.map((s) => ({
      value: s.slug,
      label: s.name,
    }));
  }

  const allowed =
    await prisma.styleAllowedProductType.findMany({
      where: {
        productType: {
          in: selectedTypes,
        },
      },
      select: {
        style: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
      orderBy: {
        style: {
          name: "asc",
        },
      },
    });

  return uniqueByValue(
    allowed.map((row) => ({
      value: row.style.slug,
      label: row.style.name,
    }))
  ).sort((a, b) =>
    a.label.localeCompare(b.label)
  );
}

const getCachedAvailableStyles =
  unstable_cache(
    async (
      selectedTypes: ProductType[]
    ) =>
      fetchAvailableStyles(
        selectedTypes
      ),
    ["storefront-available-styles"],
    {
      tags: [
        "storefront-styles",
      ],
    }
  );

export async function getAvailableStyles(
  selectedTypes: ProductType[] = []
): Promise<StyleOption[]> {
  const normalizedTypes =
    [...selectedTypes].sort();

  return getCachedAvailableStyles(
    normalizedTypes
  );
}