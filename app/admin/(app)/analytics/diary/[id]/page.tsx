import Link from "next/link";
import { cookies } from "next/headers";
import { requireAdminSession } from "@/lib/auth/AdminSession";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string }>;
};

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

  const res = await fetch(absoluteUrl(path), {
    cache: "no-store",
    headers: {
      cookie: jar.toString(),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed: ${path} (${res.status}) ${text}`);
  }

  return res.json();
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-black/10 bg-white p-5 shadow-sm">
      <div className="text-xs uppercase tracking-[0.18em] text-black/45">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-black">
        {value}
      </div>
    </div>
  );
}

function RangeLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition",
        active
          ? "border-black bg-black text-white"
          : "border-black/10 bg-white text-black/70 hover:bg-black/[0.03]",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default async function DiaryProductBreakdownPage({
  params,
  searchParams,
}: PageProps) {
  await requireAdminSession();

  const { id } = await params;
  const sp = await searchParams;

  const range =
    sp.range === "today" || sp.range === "7d" || sp.range === "30d"
      ? sp.range
      : "30d";

  const data = await getJSON(
    `/api/admin/analytics/diary/${id}/product-breakdown?range=${range}`
  );

  const post = data.post;
  const rows = data.rows ?? [];

  const qs = (r: string) => (r === "30d" ? "" : `?range=${r}`);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/admin/analytics"
              className="text-sm font-medium text-black/60 underline decoration-black/20 underline-offset-4"
            >
              ← Back to analytics
            </Link>

            <p className="mt-6 text-xs uppercase tracking-[0.22em] text-black/45">
              Editorial product breakdown
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-black">
              {post.title}
            </h1>

            <p className="mt-2 text-sm text-black/50">/{post.slug}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RangeLink
              href={`/admin/analytics/diary/${id}${qs("today")}`}
              label="Today"
              active={range === "today"}
            />
            <RangeLink
              href={`/admin/analytics/diary/${id}${qs("7d")}`}
              label="Last 7 days"
              active={range === "7d"}
            />
            <RangeLink
              href={`/admin/analytics/diary/${id}${qs("30d")}`}
              label="Last 30 days"
              active={range === "30d"}
            />
          </div>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Reads" value={post.readCount ?? 0} />
        <StatCard label="Product clicks" value={post.productClicks ?? 0} />
        <StatCard
          label="CTR"
          value={`${Number(post.ctr ?? 0).toFixed(1)}%`}
        />
      </section>

      <section className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-sm">
        <div className="border-b border-black/6 px-6 py-4">
          <h2 className="text-lg font-semibold text-black">
            Product click breakdown
          </h2>
          <p className="mt-1 text-xs text-black/50">
            Performance of each related product attached to this diary article.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-black/[0.03] text-left text-black/55">
              <tr>
                <th className="px-6 py-4 font-medium">Position</th>
                <th className="px-6 py-4 font-medium">Product</th>
                <th className="px-6 py-4 font-medium">Brand</th>
                <th className="px-6 py-4 text-right font-medium">Clicks</th>
                <th className="px-6 py-4 text-right font-medium">Share</th>
              </tr>
            </thead>

            <tbody>
              {rows.length ? (
                rows.map((row: any) => (
                  <tr key={row.product.id} className="border-t border-black/6">
                    <td className="px-6 py-4 font-medium text-black">
                      Position {row.position}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 overflow-hidden rounded-2xl border border-black/10 bg-black/5">
                          {row.product.imageUrl ? (
                            <img
                              src={row.product.imageUrl}
                              alt={row.product.title}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>

                        <div>
                          <div className="font-medium text-black">
                            {row.product.title}
                          </div>
                          {row.product.price ? (
                            <div className="mt-1 text-xs text-black/45">
                              {row.product.price} {row.product.currency}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-black/70">
                      {row.brand?.name ?? "Unknown"}
                    </td>

                    <td className="px-6 py-4 text-right font-medium text-black">
                      {row.clicks}
                    </td>

                    <td className="px-6 py-4 text-right font-medium text-black">
                      {Number(row.share ?? 0).toFixed(1)}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-black/50">
                    No related products found for this diary post.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}