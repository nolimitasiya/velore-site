import { cookies, headers } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

function absoluteUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  return `${base}${path}`;
}

async function getJSON(path: string) {
  const jar = await cookies();
  const url = await absoluteUrl(path);

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      cookie: jar.toString(),
    },
  });

  const contentType =
    res.headers.get("content-type") ?? "";

  if (!res.ok) {
    const text =
      await res.text().catch(() => "");

    throw new Error(
      `Analytics API failed: ${path} (${res.status}) ${text.slice(0, 500)}`
    );
  }

  if (!contentType.includes("application/json")) {
    const text =
      await res.text().catch(() => "");

    throw new Error(
      `Analytics API returned non-JSON: ${path} (${res.status}) ` +
        `content-type=${contentType} body=${text.slice(0, 500)}`
    );
  }

  return res.json();
}

function percent(
  value: number | null | undefined
) {
  return `${(
    Number(value ?? 0) * 100
  ).toFixed(1)}%`;
}

function score(
  value: number | null | undefined
) {
  return (
    Number(value ?? 0) * 100
  ).toFixed(1);
}

function groupLabel(group: string) {
  if (group === "productTypes") {
    return "Product type";
  }

  if (group === "colours") {
    return "Colour";
  }

  if (group === "styles") {
    return "Style";
  }

  if (group === "materials") {
    return "Material";
  }

  if (group === "occasions") {
    return "Occasion";
  }

  return group;
}

export default async function SignalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{
    group: string;
    key: string;
  }>;

  searchParams: Promise<{
  range?: string;
  from?: string;
  to?: string;
  country?: string;
  source?: string;
}>;
}) {
  const { group, key } =
    await params;

  const sp =
    await searchParams;

  const range =
    sp.range ?? "30d";

  const from =
    sp.from ?? "";

  const to =
    sp.to ?? "";

  const country =
  sp.country &&
  sp.country.toLowerCase() !== "all"
    ? sp.country.toUpperCase()
    : "all";

  const source =
    sp.source && sp.source.toLowerCase() !== "all"
      ? sp.source.toUpperCase()
      : "all";

  const data =
  await getJSON(
    `/api/admin/analytics/index-overview?range=${range}&from=${from}&to=${to}&country=${country}&source=${source}`
  );

  const rows =
    data?.marketSignals?.[
      group
    ] ?? [];

  const row =
    rows.find(
      (item: any) =>
        String(item.key) ===
        decodeURIComponent(key)
    );

  if (!row) {
    return (
      <div className="min-h-screen bg-neutral-50/70 p-8">
        <div className="mx-auto max-w-5xl">
          <Link
            href={`/admin/analytics/veilora-index?range=${range}&from=${from}&to=${to}&country=${country}&source=${source}`}
            className="text-sm font-medium text-[#7B2D3E]"
          >
            ← Back to Veilora Index
          </Link>

          <div className="mt-8 rounded-[28px] border border-black/10 bg-white p-8">
            <h1 className="text-xl font-semibold">
              Signal not found
            </h1>
          </div>
        </div>
      </div>
    );
  }

  const viewContribution =
    Number(row.viewRate ?? 0) *
    0.2;

  const saveContribution =
    Number(row.saveRate ?? 0) *
    0.3;

  const intentContribution =
    Number(
      row.shopIntentRate ?? 0
    ) * 0.5;

  return (
    <div className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-[1400px] space-y-6 p-6 md:p-8">

        <Link
          href={`/admin/analytics/veilora-index?range=${range}&from=${from}&to=${to}&country=${country}&source=${source}`}
          className="inline-flex text-sm font-medium text-[#7B2D3E]"
        >
          ← Back to Veilora Index
        </Link>

        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 md:px-8">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            {groupLabel(group)}
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {row.label}
          </h1>

          <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/70">
            <span>
              Current rank{" "}
              {row.currentRank != null
                ? `#${row.currentRank}`
                : "—"}
            </span>

            <span>•</span>

            <span>
              {row.momentumStatus}
            </span>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-black/10 bg-white p-5">
            <div className="text-xs text-neutral-400">
              Veilora Score
            </div>

            <div className="mt-2 text-3xl font-semibold">
              {score(row.currentScore)}
            </div>

            <div className="mt-1 text-xs text-neutral-400">
              Weighted shopper response
            </div>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white p-5">
            <div className="text-xs text-neutral-400">
              Unique exposed sessions
            </div>

            <div className="mt-2 text-3xl font-semibold">
              {row.uniqueImpressionSessions ?? 0}
            </div>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white p-5">
            <div className="text-xs text-neutral-400">
              Current rank
            </div>

            <div className="mt-2 text-3xl font-semibold">
              {row.currentRank != null
                ? `#${row.currentRank}`
                : "—"}
            </div>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white p-5">
            <div className="text-xs text-neutral-400">
              Previous rank
            </div>

            <div className="mt-2 text-3xl font-semibold">
              {row.previousRank != null
                ? `#${row.previousRank}`
                : "—"}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
            <div className="text-sm font-semibold">
              Behaviour
            </div>

            <div className="mt-0.5 text-xs text-neutral-400">
              How shoppers responded after exposure
            </div>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-3">
            <div>
              <div className="text-xs text-neutral-400">
                View rate
              </div>

              <div className="mt-1 text-2xl font-semibold">
                {percent(row.viewRate)}
              </div>

              <div className="mt-1 text-xs text-neutral-400">
                20% Index weight
              </div>
            </div>

            <div>
              <div className="text-xs text-neutral-400">
                Save rate
              </div>

              <div className="mt-1 text-2xl font-semibold">
                {percent(row.saveRate)}
              </div>

              <div className="mt-1 text-xs text-neutral-400">
                30% Index weight
              </div>
            </div>

            <div>
              <div className="text-xs text-neutral-400">
                Shop intent rate
              </div>

              <div className="mt-1 text-2xl font-semibold text-[#7B2D3E]">
                {percent(
                  row.shopIntentRate
                )}
              </div>

              <div className="mt-1 text-xs text-neutral-400">
                50% Index weight
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
            <div className="text-sm font-semibold">
              Veilora Score breakdown
            </div>

            <div className="mt-0.5 text-xs text-neutral-400">
              Why this signal received its current rank
            </div>
          </div>

          <div className="space-y-5 p-5">

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  Interest
                </div>

                <div className="text-xs text-neutral-400">
                  View rate × 20%
                </div>
              </div>

              <div className="font-semibold">
                {(viewContribution * 100).toFixed(1)}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  Consideration
                </div>

                <div className="text-xs text-neutral-400">
                  Save rate × 30%
                </div>
              </div>

              <div className="font-semibold">
                {(saveContribution * 100).toFixed(1)}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">
                  Commercial intent
                </div>

                <div className="text-xs text-neutral-400">
                  Shop intent rate × 50%
                </div>
              </div>

              <div className="font-semibold">
                {(intentContribution * 100).toFixed(1)}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-black/10 pt-4">
              <div className="font-semibold">
                Veilora Score
              </div>

              <div className="text-xl font-semibold text-[#7B2D3E]">
                {score(row.currentScore)}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
            <div className="text-sm font-semibold">
              Activity volume
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <div className="text-xs text-neutral-400">
                Exposure
              </div>

              <div className="mt-1 text-xl font-semibold">
                {row.impressions}
              </div>
            </div>

            <div>
              <div className="text-xs text-neutral-400">
                Views
              </div>

              <div className="mt-1 text-xl font-semibold">
                {row.views}
              </div>
            </div>

            <div>
              <div className="text-xs text-neutral-400">
                Saves
              </div>

              <div className="mt-1 text-xl font-semibold">
                {row.wishlistAdds}
              </div>
            </div>

            <div>
              <div className="text-xs text-neutral-400">
                Shop clicks
              </div>

              <div className="mt-1 text-xl font-semibold">
                {row.shopClicks}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
  <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
    <div className="text-sm font-semibold">
      Brands driving this signal
    </div>

    

    <div className="mt-0.5 text-xs text-neutral-400">
      Brands contributing shopper response
      to {row.label} during this period.
    </div>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full min-w-[950px] text-sm">
      <thead className="text-left text-xs uppercase tracking-wide text-[#a89280]">
        <tr>
          <th className="px-4 py-3">
            Brand
          </th>

          <th className="px-4 py-3 text-right">
            Exposure
          </th>

          <th className="px-4 py-3 text-right">
            Sessions
          </th>

          <th className="px-4 py-3 text-right">
            Views
          </th>

          <th className="px-4 py-3 text-right">
            Saves
          </th>

          <th className="px-4 py-3 text-right">
            Shop
          </th>

          <th className="px-4 py-3 text-right">
            View rate
          </th>

          <th className="px-4 py-3 text-right">
            Save rate
          </th>

          <th className="px-4 py-3 text-right">
            Intent rate
          </th>
        </tr>
      </thead>

      <tbody>
        {(row.brandBreakdown ?? [])
          .map((brand: any) => (
            <tr
              key={brand.brandId}
              className="border-t border-black/6"
            >
             <td className="px-4 py-3.5 font-medium text-black">
  {brand.slug ? (
    <Link
      href={`/admin/analytics/veilora-index/signal/${group}/${encodeURIComponent(
  key
)}/brand/${encodeURIComponent(
  brand.slug
)}?range=${range}&from=${from}&to=${to}&country=${country}&source=${source}`}
      className="transition hover:text-[#7B2D3E] hover:underline"
    >
      {brand.name}
    </Link>
  ) : (
    brand.name
  )}
</td>

              <td className="px-4 py-3.5 text-right">
                {brand.impressions}
              </td>

              <td className="px-4 py-3.5 text-right">
                {
                  brand.uniqueImpressionSessions
                }
              </td>

              <td className="px-4 py-3.5 text-right">
                {brand.views}
              </td>

              <td className="px-4 py-3.5 text-right">
                {brand.wishlistAdds}
              </td>

              <td className="px-4 py-3.5 text-right">
                {brand.shopClicks}
              </td>

              <td className="px-4 py-3.5 text-right">
                {percent(
                  brand.viewRate
                )}
              </td>

              <td className="px-4 py-3.5 text-right">
                {percent(
                  brand.saveRate
                )}
              </td>

              <td className="px-4 py-3.5 text-right font-semibold text-[#7B2D3E]">
                {percent(
                  brand.shopIntentRate
                )}
              </td>
            </tr>
          ))}

        {!row.brandBreakdown?.length ? (
          <tr>
            <td
              colSpan={9}
              className="px-4 py-8 text-center text-sm text-neutral-400"
            >
              No brand contribution data yet.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  </div>
</section>

<section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
  <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
    <div className="text-sm font-semibold">
      Products driving this signal
    </div>

    <div className="mt-0.5 text-xs text-neutral-400">
      Individual products contributing shopper response
      to {row.label} during this period.
    </div>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full min-w-[1100px] text-sm">
      <thead className="text-left text-xs uppercase tracking-wide text-[#a89280]">
        <tr>
          <th className="px-4 py-3">
            Product
          </th>

          <th className="px-4 py-3">
            Brand
          </th>

          <th className="px-4 py-3 text-right">
            Exposure
          </th>

          <th className="px-4 py-3 text-right">
            Sessions
          </th>

          <th className="px-4 py-3 text-right">
            Views
          </th>

          <th className="px-4 py-3 text-right">
            Saves
          </th>

          <th className="px-4 py-3 text-right">
            Shop
          </th>

          <th className="px-4 py-3 text-right">
            View rate
          </th>

          <th className="px-4 py-3 text-right">
            Save rate
          </th>

          <th className="px-4 py-3 text-right">
            Intent rate
          </th>
        </tr>
      </thead>

      <tbody>
        {(row.productBreakdown ?? []).map(
          (product: any) => (
            <tr
              key={product.productId}
              className="border-t border-black/6"
            >
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-neutral-50">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="font-medium text-black">
                    {product.title}
                  </div>
                </div>
              </td>

              <td className="px-4 py-3.5 text-neutral-600">
                {product.brandName}
              </td>

              <td className="px-4 py-3.5 text-right">
                {product.impressions}
              </td>

              <td className="px-4 py-3.5 text-right">
                {
                  product.uniqueImpressionSessions
                }
              </td>

              <td className="px-4 py-3.5 text-right">
                {product.views}
              </td>

              <td className="px-4 py-3.5 text-right">
                {product.wishlistAdds}
              </td>

              <td className="px-4 py-3.5 text-right">
                {product.shopClicks}
              </td>

              <td className="px-4 py-3.5 text-right">
                {percent(
                  product.viewRate
                )}
              </td>

              <td className="px-4 py-3.5 text-right">
                {percent(
                  product.saveRate
                )}
              </td>

              <td className="px-4 py-3.5 text-right font-semibold text-[#7B2D3E]">
                {percent(
                  product.shopIntentRate
                )}
              </td>
            </tr>
          )
        )}

        {!row.productBreakdown?.length ? (
          <tr>
            <td
              colSpan={10}
              className="px-4 py-8 text-center text-sm text-neutral-400"
            >
              No product contribution data yet.
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  </div>
</section>

      </div>
    </div>
  );
}