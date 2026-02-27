
import { cookies } from "next/headers";
export const dynamic = "force-dynamic";

function absoluteUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return `${base}${path}`;
}

async function getJSON(path: string) {
  const jar = await cookies(); // (async in your Next version)
  const res = await fetch(absoluteUrl(path), {
    cache: "no-store",
    headers: {
      cookie: jar.toString(), // ✅ forward admin_authed to API
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed: ${path} (${res.status}) ${text}`);
  }
  return res.json();
}

function RangeLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <a
      href={href}
      className={[
        "rounded-full border px-3 py-1.5 text-sm",
        active ? "bg-black text-white border-black" : "hover:bg-black/5",
      ].join(" ")}
    >
      {label}
    </a>
  );
}

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range = (sp.range === "today" || sp.range === "7d" || sp.range === "30d") ? sp.range : "30d";

  const summary = await getJSON(`/api/admin/revenue/summary`);
  const topBrands = await getJSON(`/api/admin/revenue/clicks-by-brand?range=${range}&take=5`);
  const topProducts = await getJSON(`/api/admin/revenue/clicks-by-product?range=${range}&take=5`);
  const regions = await getJSON(`/api/admin/revenue/regions?range=${range}`);

  const qs = (r: string) => (r === "30d" ? "" : `?range=${r}`);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Analytics</h1>

      {/* Cards remain fixed: today / 7 / 30 */}
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

      {/* Range toggle for tables */}
      <div className="flex flex-wrap gap-2">
        <RangeLink href={`/admin/revenue${qs("today")}`} label="Today" active={range === "today"} />
        <RangeLink href={`/admin/revenue${qs("7d")}`} label="Last 7 days" active={range === "7d"} />
        <RangeLink href={`/admin/revenue${qs("30d")}`} label="Last 30 days" active={range === "30d"} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
  <a
    href={`/api/admin/revenue/export/clicks-by-brand?range=${range}&take=1000`}
    className="rounded-xl border px-3 py-2 text-sm hover:bg-black/5"
  >
    Download brands report
  </a>

  <a
    href={`/api/admin/revenue/export/clicks-by-product?range=${range}&take=1000`}
    className="rounded-xl border px-3 py-2 text-sm hover:bg-black/5"
  >
    Download products report
  </a>

  <a
    href={`/api/admin/revenue/export/raw-clicks?range=${range}&take=20000`}
    className="rounded-xl border px-3 py-2 text-sm hover:bg-black/5"
  >
    Download raw clicks report
  </a>
</div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top brands */}
        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="px-4 py-3 border-b">
            <div className="font-semibold">Top brands</div>
            <div className="text-xs text-neutral-500">Range: {range}</div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-600">
              <tr>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3 text-right">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {(topBrands?.rows ?? []).map((r: any) => (
                <tr key={r.brandId} className="border-t">
                  <td className="px-4 py-3">{r.brand?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-right font-medium">{r.clicks}</td>
                </tr>
              ))}
              {(topBrands?.rows ?? []).length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-neutral-500" colSpan={2}>
                    No clicks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Top products */}
        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="px-4 py-3 border-b">
            <div className="font-semibold">Top products</div>
            <div className="text-xs text-neutral-500">Range: {range}</div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-neutral-600">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3 text-right">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {(topProducts?.rows ?? []).map((r: any) => (
                <tr key={`${r.brand?.id ?? "b"}:${r.productId}`} className="border-t">
                  <td className="px-4 py-3">{r.product?.title ?? "Unknown product"}</td>
                  <td className="px-4 py-3">{r.brand?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-right font-medium">{r.clicks}</td>
                </tr>
              ))}
              {(topProducts?.rows ?? []).length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-neutral-500" colSpan={3}>
                    No product-level clicks yet (productId may be null).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regions payload is now range-aware too; we’ll render it next if you want */}
      {/* console.log(regions) */}
    </div>
  );
}