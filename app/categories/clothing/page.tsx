import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const TYPES = ["abaya", "dress", "skirt", "top", "hijab"] as const;
type ProductType = (typeof TYPES)[number];
const ALLOWED_TYPES = new Set<ProductType>(TYPES);

function toStr(v: unknown) {
  return Array.isArray(v) ? String(v[0] ?? "") : String(v ?? "");
}

export default async function ClothingPage({
  searchParams,
}: {
  // ✅ Next 16 can pass this as a Promise
  searchParams: Promise<{ type?: string | string[] }> | { type?: string | string[] };
}) {
  // ✅ Handle BOTH: object or Promise
  const sp = await Promise.resolve(searchParams);

  const rawType = toStr(sp?.type);
  const type = decodeURIComponent(rawType).trim().toLowerCase();
  const selectedType: ProductType | "" = ALLOWED_TYPES.has(type as ProductType)
    ? (type as ProductType)
    : "";

  const clothing = await prisma.category.findUnique({
    where: { slug: "clothing" },
    select: { id: true },
  });

  const products = await prisma.product.findMany({
    where: {
      categoryId: clothing?.id,
      isActive: true,
      publishedAt: { not: null },
      ...(selectedType ? { productType: selectedType } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { brand: true, images: true },
    take: 120,
  });

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-center text-2xl font-semibold">Clothing</h1>

      

      {/* Filter chips (centered + active state) */}
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
        {products.map((p) => {
          const img = p.images?.[0]?.url;
          const price = p.price ? `${p.currency} ${Number(p.price).toFixed(2)}` : null;

          return (
            <div key={p.id} className="rounded-2xl border border-black/10 bg-white">
              <Link href={`/p/${p.slug}`} className="block">
                <div className="aspect-[3/4] w-full overflow-hidden rounded-t-2xl bg-black/5">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
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
                  {price && <div className="mt-2 text-sm">{price}</div>}
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
          );
        })}
      </div>
    </div>
  );
}
