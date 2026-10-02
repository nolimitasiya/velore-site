import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminFitPage() {
  const [
    brandSizeChartCount,
    productFitCount,
    sizeMappingCount,
    shopperFitProfileCount,
  ] = await Promise.all([
    prisma.brandSizeChart.count(),
    prisma.productFitProfile.count(),
    prisma.productSizeChartMapping.count(),
    prisma.shopperFitProfile.count(),
  ]);

  return (
    <main className="min-h-screen bg-neutral-50/70">
      <div className="space-y-6">
        {/* Header */}
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 shadow-sm md:px-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Admin catalogue
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                Fit &amp; Sizing
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
                Manage brand size charts, product measurements and the fit data
                that powers Veilora Fit.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <MetricCard
                label="Brand charts"
                value={brandSizeChartCount}
              />

              <MetricCard
                label="Product fit"
                value={productFitCount}
              />

              <MetricCard
                label="Size mappings"
                value={sizeMappingCount}
              />

              <MetricCard
                label="Shopper profiles"
                value={shopperFitProfileCount}
              />
            </div>
          </div>
        </section>

        {/* Management */}
        <section className="grid gap-6 xl:grid-cols-2">
          <ManagementCard
            eyebrow="Brand sizing"
            title="Brand Size Charts"
            description="Store the sizing information supplied by each brand, including measurement ranges, units, garment components and source information."
            href="/admin/fit/size-charts"
            action="Manage size charts"
          />

          <ManagementCard
            eyebrow="Product intelligence"
            title="Product Fit"
            description="Manage intended fit, fabric stretch, product-specific measurements and mappings between product sizes and brand size charts."
            href="/admin/fit/products"
            action="Manage product fit"
          />
        </section>

        {/* Architecture note */}
        <section className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:p-8">
          <div className="max-w-3xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
              Veilora Fit
            </div>

            <h2 className="mt-2 text-xl font-semibold tracking-tight text-black">
              Product sizing stays connected to the catalogue
            </h2>

            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Existing product sizes remain the source of which sizes a product
              is sold in. Veilora Fit adds measurement and fit intelligence to
              those sizes rather than creating a second catalogue sizing
              system.
            </p>

            <div className="mt-5">
              <Link
                href="/admin/products"
                className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                View products
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
      <div className="text-xs text-white/50">{label}</div>

      <div className="mt-1 text-xl font-semibold text-white">
        {value}
      </div>
    </div>
  );
}

function ManagementCard({
  eyebrow,
  title,
  description,
  href,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] md:p-7">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a89280]">
        {eyebrow}
      </div>

      <h2 className="mt-2 text-xl font-semibold tracking-tight text-black">
        {title}
      </h2>

      <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
        {description}
      </p>

      <div className="mt-6">
        <Link
          href={href}
          className="inline-flex items-center justify-center rounded-full bg-[#7B2D3E] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#6a2435]"
        >
          {action}
        </Link>
      </div>
    </div>
  );
}