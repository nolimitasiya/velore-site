// app/brands/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SiteShell from "@/components/SiteShell";

export default async function BrandsPage() {
  const brands = await prisma.brand.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      name: true,
      slug: true,
      baseCity: true,
      baseCountryCode: true,
      baseRegion: true,
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  return (
    <SiteShell>
      <main className="mx-auto w-full max-w-[1800px] px-8 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Brands</h1>
          <p className="mt-2 text-sm text-black/60">
            Browse brands on Veilora Club.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => (
            <Link
              key={b.id}
              href={`/brands/${b.slug}`}
              className="rounded-2xl border border-black/10 bg-white p-5 hover:bg-black/[0.02] transition"
            >
              <div className="text-lg font-semibold">{b.name}</div>

              <div className="mt-1 text-sm text-black/60">
                {b.baseRegion ? b.baseRegion.replaceAll("_", " ") : "—"}
                {b.baseCountryCode ? ` • ${b.baseCountryCode}` : ""}
                {b.baseCity ? ` • ${b.baseCity}` : ""}
              </div>

              <div className="mt-3 text-xs text-black/60">
                Products: <span className="font-medium text-black">{b._count.products}</span>
              </div>
            </Link>
          ))}

          {brands.length === 0 && (
            <div className="text-sm text-black/60">No brands yet.</div>
          )}
        </div>
      </main>
    </SiteShell>
  );
}
