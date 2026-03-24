import { ProductType } from "@prisma/client";

export type RawSearchParams = Record<string, string | string[] | undefined>;

export type StorefrontFilters = {
  brands: string[];
  countries: string[];
  types: ProductType[];
  styles: string[];
  colors: string[];
  sizes: string[];
  min: number | null;
  max: number | null;
  sort: string;
  saleOn: boolean;
  nextDayOn: boolean;
};

function values(spValue: string | string[] | undefined): string[] {
  if (Array.isArray(spValue)) {
    return spValue
      .flatMap((v) => String(v).split(","))
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return String(spValue ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return typeof v === "string" ? v : "";
}

function toNum(v: unknown): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function isProductType(v: string): v is ProductType {
  return (Object.values(ProductType) as string[]).includes(v);
}

function truthy(v: string): boolean {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function unique(xs: string[]): string[] {
  return Array.from(new Set(xs));
}

export function parseStorefrontFilters(sp: RawSearchParams): StorefrontFilters {
  const brands = unique(values(sp.brand));
  const countries = unique(values(sp.country).map((v) => v.toUpperCase()));

  const types = unique(values(sp.type).map((v) => v.toUpperCase())).filter(
    isProductType
  ) as ProductType[];

  const styles = unique(values(sp.style).map((v) => v.toLowerCase()));
  const colors = unique(values(sp.color).map((v) => v.toLowerCase()));
  const sizes = unique(values(sp.size).map((v) => v.toLowerCase()));

  const min = toNum(first(sp.min));
  const max = toNum(first(sp.max));
  const sort = first(sp.sort) || "new";

  const saleOn = truthy(first(sp.sale));
  const nextDayOn = truthy(first(sp.next_day));

  return {
    brands,
    countries,
    types,
    styles,
    colors,
    sizes,
    min,
    max,
    sort,
    saleOn,
    nextDayOn,
  };
}