import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { ProductType } from "@prisma/client";
import MerchandisingTabs from "./MerchandisingTabs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatProductType(value: string) {
  if (value === "COATS_JACKETS") {
    return "Coats & Jackets";
  }

  if (value === "HOODIE_SWEATSHIRT") {
    return "Hoodie & Sweatshirt";
  }

  if (value === "T_SHIRT") {
    return "T-Shirt";
  }

  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function formatRegion(value: string) {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

export default async function MerchandisingPage() {
  await requireAdminSession();

  const occasions = await prisma.occasion.findMany({
    orderBy: {
      name: "asc",
    },

    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  const productTypes = Object.values(ProductType)
    .filter((type) => type !== ProductType.ACCESSORIES)
    .map((type) => ({
      value: type,
      label: formatProductType(type),
    }));


const continentRows =
  await prisma.continent.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      sortOrder: "asc",
    },
    select: {
      name: true,
      region: true,
    },
  });

const continents = continentRows.map(
  (continent) => ({
    value: continent.region,
    label: continent.name,
  })
);

  return (
  <MerchandisingTabs
    productTypes={productTypes}
    occasions={occasions}
    continents={continents}
  />
);
}