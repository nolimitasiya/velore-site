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

export default async function ProductAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const { productId } = await params;
  const sp = await searchParams;
  const range = parseRange(sp.range);

  const { brandId } = await requireBrandContext();
  const { gte, lt } = rangeWindow(range);

  const product = await prisma.product.findFirst({
    where: { id: productId, brandId },
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

  if (!product) {
    return (
      <div className="space-y-6">
  <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="font-semibold">Product not found</div>
          <a className="mt-2 inline-block underline" href="/brand/revenue/products">
            Back
          </a>
        </div>
      </div>
    );
  }

  const totalClicks = await prisma.affiliateClick.count({
    where: { brandId, productId, clickedAt: { gte, lt } },
  });

  const grouped = await prisma.affiliateClick.groupBy({
    by: ["countryCode"],
    where: {
      brandId,
      productId,
      clickedAt: { gte, lt },
      countryCode: { not: null },
    },
    _count: { _all: true },
    orderBy: { countryCode: "asc" },
    take: 5000,
  });

  const byCountry = grouped
    .map((g) => ({
      countryCode: g.countryCode!,
      clicks: Number(g._count._all ?? 0),
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 50);

  const maxClicks = Math.max(1, ...byCountry.map((r) => r.clicks));

  const qs = (r: RangeKey) => (r === "30d" ? "" : `?range=${r}`);

  return (
  <div className="space-y-6">
    <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 md:px-8">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-2">
          <a
            className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/50 underline-offset-4 hover:text-white/80"
            href={`/brand/revenue/products${qs(range)}`}
          >
            ← Back to top products
          </a>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{product.title}</h1>
          <p className="text-sm text-white/60">
            Range: <span className="font-medium text-white/80">{range}</span> · Total clicks:{" "}
            <span className="font-medium text-white/80">{totalClicks}</span>
          </p>
        </div>
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/20 bg-white/10">
          {product.images?.[0]?.url ? (
            <img src={product.images[0].url} alt={product.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-white/40">No image</div>
          )}
        </div>
      </div>
    </section>

      {/* Keep your table */}
      <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
  <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
    <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">Breakdown</div>
    <div className="mt-0.5 font-semibold text-black">Clicks by country</div>
    <div className="text-xs text-neutral-400">Range: {range}</div>
  </div>
  <table className="w-full text-sm">
    <thead className="bg-[#fdf7f4] text-left text-[#a89280]">
            <tr>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3 text-right">Clicks</th>
              <th className="px-4 py-3">Intensity</th>
            </tr>
          </thead>
          <tbody>
            {byCountry.slice(0, 20).map((r) => (
              <tr key={r.countryCode} className="border-t">
                <td className="px-4 py-3 font-medium">{r.countryCode}</td>
                <td className="px-4 py-3 text-right">{r.clicks}</td>
                <td className="px-4 py-3">
                  <div className="h-2 w-full rounded-full bg-black/10 overflow-hidden">
                    <div
                      className="h-2 bg-[#7B2D3E]/70"
                      style={{
                        width: `${Math.max(
                          5,
                          Math.round((r.clicks / maxClicks) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}

            {byCountry.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-neutral-500" colSpan={3}>
                  No geo clicks yet for this product.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* NEW visual (kept separate) */}
      <CountryHeatmapGrid
        rows={byCountry}
        title="Geo heatmap (this product)"
        maxTiles={60}
      />
    </div>
  );
}