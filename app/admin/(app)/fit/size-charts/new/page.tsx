import Link from "next/link";

import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";

import NewSizeChartForm from "./NewSizeChartForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewSizeChartPage() {
  await requireAdminSession();

  const brands = await prisma.brand.findMany({
    orderBy: {
      name: "asc",
    },

    select: {
      id: true,
      name: true,
    },
  });

  return (
    <main className="min-h-screen bg-neutral-50/70">
      <div className="space-y-6">
        <section className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 shadow-sm md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                Admin catalogue · Fit &amp; Sizing
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                New Size Chart
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/60">
                Create the chart record first, then add its
                size rows and measurements.
              </p>
            </div>

            <Link
              href="/admin/fit/size-charts"
              className="inline-flex w-fit items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/15"
            >
              ← Brand size charts
            </Link>
          </div>
        </section>

        {brands.length === 0 ? (
          <section className="rounded-[28px] border border-black/10 bg-white px-6 py-12 text-center">
            <h2 className="text-lg font-semibold text-black">
              No brands available
            </h2>

            <p className="mt-2 text-sm text-neutral-500">
              A brand must exist before you can create a size
              chart.
            </p>
          </section>
        ) : (
          <NewSizeChartForm brands={brands} />
        )}
      </div>
    </main>
  );
}