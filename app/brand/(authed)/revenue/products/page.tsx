import { prisma } from "@/lib/prisma";
import { requireBrandContext } from "@/lib/auth/BrandSession";
import CountryHeatmapGrid from "@/components/analytics/CountryHeatmapGrid";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type RangeKey = "today" | "7d" | "30d";

function parseRange(input?: string): RangeKey {
  const r = String(input ?? "").toLowerCase();
  if (r === "today" || r === "7d" || r === "30d") return r;
  return "30d";
}

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function rangeWindow(range: RangeKey) {
  const now = new Date();
  if (range === "today") {
    const gte = startOfDay(now);
    const lt = addDays(gte, 1);
    return { gte, lt };
  }
  if (range === "7d") {
    const gte = startOfDay(addDays(now, -6));
    const lt = addDays(startOfDay(now), 1);
    return { gte, lt };
  }
  const gte = startOfDay(addDays(now, -29));
  const lt = addDays(startOfDay(now), 1);
  return { gte, lt };
}

export default async function BrandTopProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = parseRange(sp.range);

  const { brandId } = await requireBrandContext();
  const { gte, lt } = rangeWindow(range);

  const grouped = await prisma.affiliateClick.groupBy({
    by: ["productId"],
    where: {
      brandId,
      productId: { not: null },
      clickedAt: { gte, lt },
    },
    _count: { _all: true },
    orderBy: { productId: "asc" },
    take: 5000,
  });

  const sorted = [...grouped].sort(
    (a, b) => Number(b._count?._all ?? 0) - Number(a._count?._all ?? 0)
  );

  const top = sorted.slice(0, 5);
  const productIds = top.map((r) => r.productId!).filter(Boolean);

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, brandId },
    select: {
      id: true,
      title: true,
      currency: true,
      price: true,
      sourceUrl: true,
      images: {
        select: { url: true },
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
  });

  const pMap = new Map(products.map((p) => [p.id, p]));

  const rows = top.map((r) => {
    const p = pMap.get(r.productId!) ?? null;
    return {
      productId: r.productId!,
      title: p?.title ?? "Unknown product",
      imageUrl: p?.images?.[0]?.url ?? "",
      clicks: Number(r._count?._all ?? 0),
      price: p?.price ? `${p.currency} ${p.price}` : "—",
      sourceUrl: p?.sourceUrl ?? "",
    };
  });

  const qs = (r: RangeKey) => (r === "30d" ? "" : `?range=${r}`);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Top products</h1>
          <p className="mt-1 text-sm text-neutral-600">Range: {range}</p>
        </div>

        <a
          href={`/brand/revenue${qs(range)}`}
          className="text-sm underline underline-offset-4"
        >
          Back to Analytics
        </a>
      </div>

      <div className="rounded-2xl border bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-600">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3 text-right">Clicks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.productId} className="border-t">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-lg border bg-neutral-50 flex items-center justify-center">
                      {r.imageUrl ? (
                        <img
                          src={r.imageUrl}
                          alt={r.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-neutral-400">No image</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <a
                        className="font-medium hover:underline underline-offset-4 truncate block"
                        href={`/brand/revenue/products/${r.productId}${qs(range)}`}
                      >
                        {r.title}
                      </a>
                      {r.sourceUrl ? (
                        <a
                          className="text-xs text-neutral-500 underline underline-offset-2"
                          href={r.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Source
                        </a>
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{r.price}</td>
                <td className="px-4 py-3 text-right font-medium">{r.clicks}</td>
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-neutral-500" colSpan={3}>
                  No product clicks yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}