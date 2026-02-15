export const dynamic = "force-dynamic";

async function getJSON(path: string) {
  const res = await fetch(path, { cache: "no-store" });
  return res.json();
}

export default async function RevenuePage() {
  // relative fetch works in Next server components
const summary = await getJSON(`/api/admin/revenue/summary`);
const regions = await getJSON(`/api/admin/revenue/regions`);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Revenue</h1>

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

      {/* next: tables for clicks-by-brand, earnings, payouts */}
    </div>
  );
}
