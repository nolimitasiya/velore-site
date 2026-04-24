import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { Region, ProductType } from "@prisma/client";
import { getAvailableStyles } from "@/lib/storefront/getAvailableStyles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isProductType(v: string): v is ProductType {
  return (Object.values(ProductType) as string[]).includes(v);
}

function formatProductTypeLabel(value: string) {
  if (value === "COATS_JACKETS") return "Coats & Jackets";
  if (value === "HOODIE_SWEATSHIRT") return "Hoodie & Sweatshirt";
  if (value === "T_SHIRT") return "T-Shirt";

  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function parseCsv(value: string | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const typeRaw = (url.searchParams.get("type") || "").toUpperCase();
  const typeParams = url.searchParams.getAll("type");

  const selectedTypes = Array.from(
    new Set(
      (typeParams.length ? typeParams : parseCsv(typeRaw))
        .map((v) => v.toUpperCase())
        .filter(isProductType)
    )
  ) as ProductType[];

  const selectedType: ProductType | "" =
    selectedTypes.length === 1 ? selectedTypes[0] : "";

  const products = await prisma.product.findMany({
  where: {
    status: "APPROVED",
    isActive: true,
    publishedAt: { not: null },

    ...(selectedTypes.length
      ? { productType: { in: selectedTypes } }
      : {}),
  },
    select: {
      productType: true,
      brand: {
        select: {
          id: true,
          name: true,
          slug: true,
          baseCountryCode: true,
          baseRegion: true,
        },
      },
      productSizes: { select: { size: { select: { slug: true, name: true } } } },
      productColours: { select: { colour: { select: { slug: true, name: true } } } },
    },
    take: 5000,
  });

  const countries = Array.from(
    new Set(products.map((p) => p.brand.baseCountryCode).filter(Boolean) as string[])
  ).sort();

  const regions = Array.from(
    new Set(products.map((p) => p.brand.baseRegion).filter(Boolean) as Region[])
  ).sort();

  const brands = Array.from(
    new Map(
      products.map((p) => [
        p.brand.slug,
        { value: p.brand.slug, label: p.brand.name },
      ])
    ).values()
  ).sort((a, b) => a.label.localeCompare(b.label));

  const types = Array.from(
    new Set(products.map((p) => p.productType).filter(Boolean) as ProductType[])
  ).sort();

  const styles = await getAvailableStyles(selectedTypes);

  const sizes = Array.from(
    new Map(
      products
        .flatMap((p) => p.productSizes.map((x) => x.size))
        .filter(Boolean)
        .map((s) => [s.slug, { value: s.slug, label: s.name.toLowerCase() }])
    ).values()
  ).sort((a, b) => a.label.localeCompare(b.label));

  const colors = Array.from(
    new Map(
      products
        .flatMap((p) => p.productColours.map((x) => x.colour))
        .filter(Boolean)
        .map((c) => [c.slug, { value: c.slug, label: c.name.toLowerCase() }])
    ).values()
  ).sort((a, b) => a.label.localeCompare(b.label));

    const typeOpts = types.map((t) => ({
    value: t,
    label: formatProductTypeLabel(t),
  }));

  return NextResponse.json({
    ok: true,
    countries,
    regions,
    brands,
    types: typeOpts,
    styles,
    sizes,
    colors,
    meta: {
      selectedType,
      selectedTypes,
    },
  });
}