import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import BrandSwitcher from "./BrandSwitcher";
import BrandNotesEditor from "./BrandNotesEditor";
import BrandHomepageSettingsEditor from "./BrandHomepageSettingsEditor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminBrandDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;

  const [brand, allBrands] = await Promise.all([
    prisma.brand.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.brand.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!brand) {
    return (
      <main className="mx-auto w-full max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-semibold">Brand not found</h1>
        <Link className="mt-4 inline-block text-sm underline" href="/admin/brands">
          Back to brands
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-6xl px-6 py-10 space-y-6">

        {/* HEADER */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">{brand.name}</h1>

              {brand.showOnHomepage && (
                <span className="inline-flex items-center rounded-full bg-[#6b1f2b] px-3 py-1 text-xs font-semibold tracking-[0.14em] text-white">
                  FEATURED
                </span>
              )}
            </div>

            <p className="mt-1 text-sm text-neutral-500">{brand.slug}</p>

            {brand.showOnHomepage && brand.homepageOrder && (
              <p className="mt-2 text-xs text-neutral-500">
                Homepage order: {brand.homepageOrder}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <BrandSwitcher currentId={brand.id} brands={allBrands} />

            <Link
              href="/admin/brands"
              className="inline-flex h-10 items-center rounded-2xl border border-black/10 bg-white px-4 text-sm hover:bg-black/[0.03]"
            >
              Back
            </Link>
          </div>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

          {/* AFFILIATE CARD */}
          <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_10px_30px_rgba(0,0,0,0.04)]">
            <div className="space-y-5">

              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  Affiliate Status
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {brand.affiliateStatus}
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  Affiliate Provider
                </div>
                <div className="mt-1 text-base font-medium">
                  {brand.affiliateProvider ?? "-"}
                </div>
              </div>

              {/* 🔥 FIXED: BETTER URL CONTAINER */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  Affiliate Base URL
                </div>

                <div className="mt-2 rounded-2xl border border-black/10 bg-neutral-50 px-4 py-3 text-sm font-medium text-neutral-900 break-words leading-relaxed">
                  {brand.affiliateBaseUrl ?? "-"}
                </div>
              </div>

              {/* 🔥 FIXED: CLICKABLE WEBSITE */}
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-500">
                  Website
                </div>

                {brand.websiteUrl ? (
                  <a
                    href={brand.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm font-medium text-neutral-900 underline decoration-black/20 underline-offset-4 hover:text-black"
                  >
                    {brand.websiteUrl}
                  </a>
                ) : (
                  <div className="mt-1 text-sm text-neutral-400">-</div>
                )}
              </div>
            </div>
          </div>

          {/* HOMEPAGE SETTINGS */}
          <BrandHomepageSettingsEditor
            brandId={brand.id}
            initialShowOnHomepage={brand.showOnHomepage}
            initialHomepageOrder={brand.homepageOrder}
          />

          {/* NOTES */}
          <BrandNotesEditor brandId={brand.id} initialNotes={brand.notes} />

        </div>
      </div>
    </main>
  );
}