import { cookies } from "next/headers";
import AnalyticsNav from "@/components/analytics/AnalyticsNav";

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
      `Failed: ${path} (${res.status}) ${text}`
    );
  }

  return res.json();
}

function money(
  value: number,
  currency = "GBP"
) {
  return new Intl.NumberFormat(
    "en-GB",
    {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }
  ).format(value ?? 0);
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <div className="border-b border-[#e8ddd4] bg-[#fdf7f4] px-5 py-4">
        <div className="text-sm font-semibold text-black">
          {title}
        </div>

        {subtitle ? (
          <div className="mt-0.5 text-xs text-neutral-400">
            {subtitle}
          </div>
        ) : null}
      </div>

      {children}
    </div>
  );
}

export default async function CommerceAnalyticsPage() {
  const range = "30d";

  const [
    indexOverview,
    estimatedByBrand,
    estimatedByProduct,
    estimatedByShopperCountry,
  ] = await Promise.all([
    getJSON(
      `/api/admin/analytics/index-overview?range=${range}`
    ),

    getJSON(
      `/api/admin/analytics/estimated-by-brand?range=${range}&take=20`
    ),

    getJSON(
      `/api/admin/analytics/estimated-by-product?range=${range}&take=20`
    ),

    getJSON(
      `/api/admin/analytics/estimated-by-shopper-country?range=${range}&take=20`
    ),
  ]);

  const overview =
    indexOverview?.overview ?? {};

  return (
    <div className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-[1600px] space-y-8 p-6 md:p-8">

        <AnalyticsNav />

        {/* Hero */}
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 shadow-sm md:px-8">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            Commerce analytics
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Commercial performance
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
            Track outbound shopping intent,
            estimated commercial value and,
            later, confirmed purchases, GMV
            and Veilora commission revenue.
          </p>
        </section>

        {/* Commercial overview */}
        <section className="space-y-4">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/70">
              Commerce
            </div>

            <h2 className="text-sm font-medium text-black">
              Commercial overview
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card
              title="Shop clicks"
              subtitle="Recorded outbound purchase intent"
            >
              <div className="p-5">
                <div className="text-3xl font-semibold">
                  {overview.shopClicks ?? 0}
                </div>

                <div className="mt-1 text-xs text-neutral-400">
                  Real tracked data
                </div>
              </div>
            </Card>

            <Card
              title="Purchases"
              subtitle="Confirmed orders"
            >
              <div className="p-5">
                <div className="text-3xl font-semibold">
                  —
                </div>

                <div className="mt-1 text-xs text-neutral-400">
                  Awaiting affiliate conversion data
                </div>
              </div>
            </Card>

            <Card
              title="GMV"
              subtitle="Gross Merchandise Value"
            >
              <div className="p-5">
                <div className="text-3xl font-semibold">
                  —
                </div>

                <div className="mt-1 text-xs text-neutral-400">
                  Confirmed order value later
                </div>
              </div>
            </Card>

            <Card
              title="Commission"
              subtitle="Veilora revenue"
            >
              <div className="p-5">
                <div className="text-3xl font-semibold">
                  —
                </div>

                <div className="mt-1 text-xs text-neutral-400">
                  Confirmed affiliate revenue later
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Estimated performance */}
        <section className="space-y-4">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#7B2D3E]/70">
              Forecasting
            </div>

            <h2 className="text-sm font-medium text-black">
              Estimated commercial value
            </h2>

            <p className="mt-1 max-w-3xl text-xs text-neutral-500">
              These figures are modelled estimates,
              not confirmed purchases or revenue.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card
              title="Estimated commission by brand"
              subtitle={`Range: ${range}`}
            >
              <table className="w-full text-sm">
                <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
                  <tr>
                    <th className="px-5 py-3">
                      Brand
                    </th>

                    <th className="px-5 py-3 text-right">
                      Clicks
                    </th>

                    <th className="px-5 py-3 text-right">
                      Est. commission
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {(estimatedByBrand?.rows ?? []).map(
                    (row: any) => (
                      <tr
                        key={row.brandId}
                        className="border-t border-black/6"
                      >
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-black">
                            {row.brand?.name ??
                              "Unknown"}
                          </div>

                          <div className="mt-1 text-xs text-neutral-400">
                            {(
                              Number(
                                row.commissionRate ??
                                  0
                              ) * 100
                            ).toFixed(0)}
                            % commission
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          {row.clicks}
                        </td>

                        <td className="px-5 py-3.5 text-right font-semibold text-[#7B2D3E]">
                          {money(
                            Number(
                              row.estimatedCommission ??
                                0
                            )
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </Card>

            <Card
              title="Estimated commission by shopper country"
              subtitle={`Range: ${range}`}
            >
              <table className="w-full text-sm">
                <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
                  <tr>
                    <th className="px-5 py-3">
                      Country
                    </th>

                    <th className="px-5 py-3 text-right">
                      Clicks
                    </th>

                    <th className="px-5 py-3 text-right">
                      Est. commission
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {(estimatedByShopperCountry?.rows ?? []).map(
                    (row: any) => (
                      <tr
                        key={row.countryCode}
                        className="border-t border-black/6"
                      >
                        <td className="px-5 py-3.5 font-medium">
                          {row.countryCode ??
                            "Unknown"}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          {row.clicks}
                        </td>

                        <td className="px-5 py-3.5 text-right font-semibold text-[#7B2D3E]">
                          {money(
                            Number(
                              row.estimatedCommission ??
                                0
                            )
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </Card>
          </div>
        </section>

        {/* Assumptions */}
        <section className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
          <Card
            title="Model assumptions"
            subtitle="Current defaults used by estimates"
          >
            <div className="space-y-3 p-5 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3">
                <span className="text-neutral-600">
                  Default commission
                </span>

                <span className="font-semibold">
                  15%
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3">
                <span className="text-neutral-600">
                  Default AOV
                </span>

                <span className="font-semibold">
                  £75
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3">
                <span className="text-neutral-600">
                  Default conversion
                </span>

                <span className="font-semibold">
                  2%
                </span>
              </div>

              <p className="pt-1 text-xs leading-5 text-neutral-500">
                Brand-specific commission rate
                and AOV are used when available.
                Otherwise the defaults above apply.
              </p>
            </div>
          </Card>

          <Card
            title="Top products by estimated commission"
            subtitle={`Range: ${range}`}
          >
            <div className="overflow-x-auto">
              <table className="min-w-[800px] w-full text-sm">
                <thead className="bg-[#fdf7f4] text-left text-xs uppercase tracking-wide text-[#a89280]">
                  <tr>
                    <th className="px-5 py-3">
                      Product
                    </th>

                    <th className="px-5 py-3">
                      Brand
                    </th>

                    <th className="px-5 py-3 text-right">
                      Clicks
                    </th>

                    <th className="px-5 py-3 text-right">
                      Est. commission
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {(estimatedByProduct?.rows ?? []).map(
                    (row: any) => (
                      <tr
                        key={row.productId}
                        className="border-t border-black/6"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-neutral-50">
                              {row.product?.imageUrl ? (
                                <img
                                  src={
                                    row.product
                                      .imageUrl
                                  }
                                  alt={
                                    row.product
                                      ?.title ??
                                    "Product"
                                  }
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>

                            <div>
                              <div className="font-medium text-black">
                                {row.product?.title ??
                                  "Unknown product"}
                              </div>

                              {row.product?.price ? (
                                <div className="mt-1 text-xs text-neutral-400">
                                  {
                                    row.product
                                      .price
                                  }{" "}
                                  {
                                    row.product
                                      .currency
                                  }
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 text-neutral-600">
                          {row.brand?.name ??
                            "Unknown"}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          {row.clicks}
                        </td>

                        <td className="px-5 py-3.5 text-right font-semibold text-[#7B2D3E]">
                          {money(
                            Number(
                              row.estimatedCommission ??
                                0
                            )
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

      </div>
    </div>
  );
}