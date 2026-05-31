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

      {/* HERO */}
      <div className="rounded-[28px] bg-[#7B2D3E] px-6 py-7 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45 mb-3">
              Admin · Brand detail
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                {brand.name}
              </h1>
              {brand.showOnHomepage && (
                <span className="inline-flex items-center rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold tracking-[0.14em] text-white">
                  FEATURED
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-white/50">{brand.slug}</p>
            {brand.showOnHomepage && brand.homepageOrder && (
              <p className="mt-1 text-xs text-white/40">
                Homepage order: {brand.homepageOrder}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <BrandSwitcher currentId={brand.id} brands={allBrands} />
            <Link
              href="/admin/brands"
              className="inline-flex h-10 items-center rounded-2xl border border-white/20 bg-white/10 px-4 text-sm text-white/80 transition hover:bg-white/15"
            >
              Back
            </Link>
          </div>
        </div>
      </div>

      {/* CARDS GRID — outside the hero */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

        {/* AFFILIATE CARD */}
        <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7B2D3E]/60">
            Affiliate info
          </div>
          <div className="space-y-5">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                Status
              </div>
              <div className={`mt-1 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${
                brand.affiliateStatus === "ACTIVE"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : brand.affiliateStatus === "PAUSED"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-yellow-200 bg-yellow-50 text-yellow-800"
              }`}>
                {brand.affiliateStatus}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                Provider
              </div>
              <div className="mt-1 text-sm font-medium text-neutral-800">
                {brand.affiliateProvider ?? "—"}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                Affiliate base URL
              </div>
              <div className="mt-2 rounded-2xl border border-[#e8ddd4] bg-[#fdf7f4] px-4 py-3 text-sm font-medium text-neutral-900 break-words leading-relaxed">
                {brand.affiliateBaseUrl ?? "—"}
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
                Website
              </div>
              {brand.websiteUrl ? (
                <a
                  href={brand.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-sm font-medium text-[#7B2D3E] underline decoration-[#7B2D3E]/30 underline-offset-4 hover:decoration-[#7B2D3E]"
                >
                  {brand.websiteUrl}
                </a>
              ) : (
                <div className="mt-1 text-sm text-neutral-400">—</div>
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