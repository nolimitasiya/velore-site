import Link from "next/link";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";
import BrandRowClient from "./BrandRowClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-neutral-50/70">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </div>
    </main>
  );
}

function SectionCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-[28px] border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.04)]",
        className,
      ].join(" ")}
    >
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  subtext,
  tone = "default",
}: {
  label: string;
  value: string | number;
  subtext?: string;
  tone?: "default" | "dark" | "soft";
}) {
  const toneClass =
    tone === "dark"
      ? "border-black bg-black text-white"
      : tone === "soft"
      ? "border-black/5 bg-neutral-50 text-neutral-900"
      : "border-black/10 bg-white text-neutral-900";

  const subtextClass = tone === "dark" ? "text-white/70" : "text-neutral-500";

  return (
    <div className={`rounded-[24px] border p-5 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      {subtext ? (
        <p className={`mt-2 text-sm ${subtextClass}`}>{subtext}</p>
      ) : null}
    </div>
  );
}

function EmptyState() {
  return (
    <tr>
      <td colSpan={4} className="px-6 py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full border border-black/10 bg-neutral-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
            No brands
          </div>
          <h3 className="mt-4 text-lg font-semibold tracking-tight text-neutral-900">
            No onboarded brands yet
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
            Once applications are approved and brands are onboarded, they will
            appear here for status management and affiliate setup.
          </p>
        </div>
      </td>
    </tr>
  );
}

export default async function AdminBrandsPage() {
  await requireAdminSession();

  const brands = await prisma.brand.findMany({
    orderBy: [
      { showOnHomepage: "desc" },
      { homepageOrder: "asc" },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      name: true,
      slug: true,
      createdAt: true,
      accountStatus: true,
      affiliateStatus: true,
      affiliateProvider: true,
      affiliateBaseUrl: true,
      showOnHomepage: true,
      homepageOrder: true,
    },
  });

  const homepageBrands = brands.filter((b) => b.showOnHomepage).length;
  const activeAffiliateBrands = brands.filter(
    (b) => b.affiliateStatus === "ACTIVE"
  ).length;
  const pendingAffiliateBrands = brands.filter(
    (b) => b.affiliateStatus === "PENDING" || !b.affiliateStatus
  ).length;

  return (
    <PageShell>
      <div className="space-y-6">
        <SectionCard className="overflow-hidden">
          <div className="border-b border-black/5 bg-[linear-gradient(135deg,rgba(0,0,0,0.03),rgba(0,0,0,0))] px-6 py-6 sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Brand management
            </p>

            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">
                  Brands
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
                  Manage onboarded brands, review their operational status, and
                  maintain affiliate readiness across the Veilora platform.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/admin/brands/applications"
                  className="inline-flex h-11 items-center rounded-2xl border border-black/10 bg-white px-5 text-sm font-medium text-neutral-700 transition hover:bg-black/[0.03]"
                >
                  View applications
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 xl:grid-cols-4 sm:px-8">
            <StatCard
              label="Total brands"
              value={brands.length}
              tone="dark"
              subtext="All onboarded brands in the system"
            />
            <StatCard
              label="Homepage"
              value={homepageBrands}
              subtext="Currently featured on the homepage"
            />
            <StatCard
              label="Affiliate active"
              value={activeAffiliateBrands}
              subtext="Brands ready for active affiliate tracking"
            />
            <StatCard
              label="Affiliate pending"
              value={pendingAffiliateBrands}
              tone="soft"
              subtext="Brands still needing setup or activation"
            />
          </div>
        </SectionCard>

        <SectionCard className="overflow-hidden">
          <div className="border-b border-black/5 px-6 py-5 sm:px-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Directory
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-950">
              Brand roster
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-600">
              Review each brand’s internal status, affiliate setup, and admin
              actions from a single, premium operations table.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-neutral-50/80 text-left">
                <tr className="text-xs uppercase tracking-[0.16em] text-neutral-500">
                  <th className="px-6 py-4 font-semibold">Brand</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Affiliate
                  </th>
                  <th className="px-6 py-4 text-right font-semibold">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {brands.map((b) => (
                  <BrandRowClient key={b.id} b={b} />
                ))}

                {brands.length === 0 && <EmptyState />}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}