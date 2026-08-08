import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { ProductType } from "@prisma/client";
import CategoryMerchandisingClient from "./CategoryMerchandisingClient";

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

  return (
    <CategoryMerchandisingClient
      productTypes={productTypes}
      occasions={occasions}
    />
  );
}