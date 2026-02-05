export const dynamic = "force-dynamic";

async function getJSON(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  return res.json();
}

export default async function BrandRevenuePage() {
  const base = process.env.NEXT_PUBLIC_SITE_URL;
  const summary = await getJSON(`${base}/api/brand/revenue/summary`);

  return (
    <div className="p-6 space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Analytics</h1>

        <a
          href="/api/brand/revenue/export/clicks-by-product?window=30"
          className="rounded-lg px-4 py-2 text-sm border border-black/10 hover:bg-black/5"
        >
          Download CSV (30D)
        </a>
      </div>

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-4">
          <div className="text-sm opacity-70">Clicks today</div>
          <div className="text-3xl font-semibold">{summary?.clicks?.today ?? 0}</div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="text-sm opacity-70">Last 7 days</div>
          <div className="text-3xl font-semibold">{summary?.clicks?.last7 ?? 0}</div>
        </div>

        <div className="rounded-xl border p-4">
          <div className="text-sm opacity-70">Last 30 days</div>
          <div className="text-3xl font-semibold">{summary?.clicks?.last30 ?? 0}</div>
        </div>
      </div>
    </div>
  );
}
