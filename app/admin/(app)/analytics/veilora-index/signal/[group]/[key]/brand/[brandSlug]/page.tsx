import { cookies } from "next/headers";
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

  const res = await fetch(
    absoluteUrl(path),
    {
      cache: "no-store",
      headers: {
        cookie: jar.toString(),
      },
    }
  );

  if (!res.ok) {
    const text =
      await res.text().catch(() => "");

    throw new Error(
      `Failed to load ${path} (${res.status}): ${text}`
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

export default async function SignalBrandDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{
    group: string;
    key: string;
    brandSlug: string;
  }>;

  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    country?: string;
    source?: string;
  }>;
}) {
  const {
    group,
    key,
    brandSlug,
  } = await params;

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

  const signal =
    rows.find(
      (item: any) =>
        String(item.key) ===
        decodeURIComponent(key)
    );

  if (!signal) {
    return (
      <div className="min-h-screen bg-neutral-50/70 p-8">
        <div className="mx-auto max-w-5xl">
          <Link
            href={`/admin/analytics/veilora-index/signal/${group}/${encodeURIComponent(
  key
)}?range=${range}&from=${from}&to=${to}&country=${country}&source=${source}`}
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

  const decodedBrandSlug =
    decodeURIComponent(
      brandSlug
    );

  const brand =
    (signal.brandBreakdown ?? [])
      .find(
        (item: any) =>
          String(item.slug) ===
          decodedBrandSlug
      );

  const products =
    (signal.productBreakdown ?? [])
      .filter(
        (product: any) =>
          String(
            product.brandSlug ?? ""
          ) === decodedBrandSlug
      );

  if (!brand) {
    return (
      <div className="min-h-screen bg-neutral-50/70 p-8">
        <div className="mx-auto max-w-5xl">
          <Link
            href={`/admin/analytics/veilora-index/signal/${group}/${encodeURIComponent(
  key
)}?range=${range}&from=${from}&to=${to}&country=${country}&source=${source}`}
            className="text-sm font-medium text-[#7B2D3E]"
          >
            ← Back to signal
          </Link>

          <div className="mt-8 rounded-[28px] border border-black/10 bg-white p-8">
            <h1 className="text-xl font-semibold">
              Brand contribution not found
            </h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-[1400px] space-y-6 p-6 md:p-8">

        <Link
          href={`/admin/analytics/veilora-index/signal/${group}/${encodeURIComponent(
  key
)}?range=${range}&from=${from}&to=${to}&country=${country}&source=${source}`}
          className="inline-flex text-sm font-medium text-[#7B2D3E]"
        >
          ← Back to {signal.label}
        </Link>

        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 md:px-8">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            {groupLabel(group)} · Brand contribution
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {brand.name}
          </h1>

          <p className="mt-2 text-sm text-white/60">
            How {brand.name} is contributing to the {signal.label} signal.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-black/10 bg-white p-5">
            <div className="text-xs text-neutral-400">
              Signal
            </div>

            <div className="mt-2 text-2xl font-semibold">
              {signal.label}
            </div>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white p-5">
            <div className="text-xs text-neutral-400">
              Unique exposed sessions
            </div>

            <div className="mt-2 text-3xl font-semibold">
              {brand.uniqueImpressionSessions ?? 0}
            </div>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white p-5">
            <div className="text-xs text-neutral-400">
              Shop intent rate
            </div>

            <div className="mt-2 text-3xl font-semibold text-[#7B2D3E]">
              {percent(
                brand.shopIntentRate
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-black/10 bg-white p-5">
            <div className="text-xs text-neutral-400">
              Products contributing
            </div>

            <div className="mt-2 text-3xl font-semibold">
              {products.length}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
            <div className="text-sm font-semibold">
              Brand behaviour within {signal.label}
            </div>

            <div className="mt-0.5 text-xs text-neutral-400">
              How shoppers responded to {brand.name} products carrying this signal.
            </div>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-3">
            <div>
              <div className="text-xs text-neutral-400">
                View rate
              </div>

              <div className="mt-1 text-2xl font-semibold">
                {percent(
                  brand.viewRate
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-neutral-400">
                Save rate
              </div>

              <div className="mt-1 text-2xl font-semibold">
                {percent(
                  brand.saveRate
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-neutral-400">
                Shop intent rate
              </div>

              <div className="mt-1 text-2xl font-semibold text-[#7B2D3E]">
                {percent(
                  brand.shopIntentRate
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white">
          <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
            <div className="text-sm font-semibold">
              Products driving {brand.name}
            </div>

            <div className="mt-0.5 text-xs text-neutral-400">
              Exact {brand.name} products contributing to the {signal.label} signal.
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-[#a89280]">
                <tr>
                  <th className="px-4 py-3">
                    Product
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
                {products.map(
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
                                src={
                                  product.imageUrl
                                }
                                alt={
                                  product.title
                                }
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>

                          <div className="font-medium text-black">
                            {
                              product.title
                            }
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {
                          product.impressions
                        }
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {
                          product.uniqueImpressionSessions
                        }
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {
                          product.views
                        }
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {
                          product.wishlistAdds
                        }
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {
                          product.shopClicks
                        }
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

                {!products.length ? (
                  <tr>
                    <td
                      colSpan={9}
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