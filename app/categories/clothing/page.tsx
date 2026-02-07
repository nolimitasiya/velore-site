// C:\Users\Asiya\projects\dalra\app\categories\clothing\page.tsx
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { cookies } from "next/headers";
import { getEcbRates, convert, safeCurrency } from "@/lib/currency/rates";
import { formatMoney } from "@/lib/formatMoney";
import { ProductType } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// URL values (lowercase)
const TYPES = ["abaya", "dress", "skirt", "top", "hijab"] as const;
type UrlType = (typeof TYPES)[number];
const ALLOWED_TYPES = new Set<UrlType>(TYPES);

// Map URL -> Prisma enum
const TYPE_TO_ENUM: Record<UrlType, ProductType> = {
  abaya: ProductType.ABAYA,
  dress: ProductType.DRESS,
  skirt: ProductType.SKIRT,
  top: ProductType.TOP,
  hijab: ProductType.HIJAB,
};

function toStr(v: unknown) {
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}

export default async function ClothingPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string | string[] }> | { type?: string | string[] };
}) {
  const sp = await Promise.resolve(searchParams);

  const rawType = toStr(sp?.type);
  const type = decodeURIComponent(rawType).trim().toLowerCase();
  const selectedType: UrlType | "" = ALLOWED_TYPES.has(type as UrlType) ? (type as UrlType) : "";

  /* ===========================
     🌍 Currency (SHOPPER SIDE)
     =========================== */
  const jar = await cookies();
  const chosenCurrency =
    safeCurrency(jar.get("vc_currency")?.value || jar.get("dalra_currency")?.value || "") ?? "GBP";

  const rates = await getEcbRates();

  /* ===========================
     📦 Fetch products
     =========================== */
  const clothing = await prisma.category.findUnique({
    where: { slug: "clothing" },
    select: { id: true },
  });

  const enumType = selectedType ? TYPE_TO_ENUM[selectedType] : undefined;

  const products = await prisma.product.findMany({
    where: {
      categoryId: clothing?.id,
      isActive: true,
      publishedAt: { not: null },
      ...(enumType ? { productType: enumType } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 120,
    select: {
      id: true,
      title: true,
      slug: true,
      price: true,
      currency: true,
      brand: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
      // keep if you need
      affiliateUrl: true,
    },
  });

  /* ===========================
     💱 Convert prices for display
     =========================== */
  const mapped = products.map((p) => {
    const baseAmount = p.price ? Number(p.price) : null;

    const converted =
      baseAmount != null ? convert(baseAmount, p.currency, chosenCurrency, rates) : null;

    const displayAmount = converted ?? baseAmount;

    return {
      ...p,
      imageUrl: p.images?.[0]?.url ?? null,
      displayPriceLabel: displayAmount != null ? formatMoney(displayAmount, chosenCurrency) : null,
    };
  });

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-center text-2xl font-semibold">Clothing</h1>

      {/* Filter chips */}
      <div className="mt-6 flex justify-center">
        <div className="inline-flex flex-wrap justify-center gap-2 text-sm">
          <Link
            href="/categories/clothing"
            className={[
              "rounded-full border px-3 py-1 transition-colors",
              selectedType === "" ? "bg-black text-white border-black" : "hover:bg-black/5",
            ].join(" ")}
          >
            All
          </Link>

          {TYPES.map((t) => {
            const active = selectedType === t;
            return (
              <Link
                key={t}
                href={`/categories/clothing?type=${t}`}
                className={[
                  "rounded-full border px-3 py-1 capitalize transition-colors",
                  active ? "bg-black text-white border-black" : "hover:bg-black/5",
                ].join(" ")}
              >
                {t}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Product grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {mapped.map((p) => (
          <div key={p.id} className="rounded-2xl border border-black/10 bg-white">
            <Link href={`/p/${p.slug}`} className="block">
              <div className="aspect-[3/4] w-full overflow-hidden rounded-t-2xl bg-black/5">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt={p.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-black/40">
                    No image
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="text-sm font-medium">{p.title}</div>
                <div className="mt-1 text-xs text-black/60 uppercase tracking-wide">
                  {p.brand?.name ?? ""}
                </div>

                {p.displayPriceLabel && <div className="mt-2 text-sm">{p.displayPriceLabel}</div>}
              </div>
            </Link>

            <div className="px-4 pb-4">
              <Link
                href={`/out/${p.id}`}
                className="inline-flex w-full items-center justify-center rounded-md bg-black px-4 py-2 text-sm text-white"
              >
                Buy Now
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
