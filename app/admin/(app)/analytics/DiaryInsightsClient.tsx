"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Overview = {
  totalPosts: number;
  publishedPosts: number;
  totalReads: number;
};

type PostRow = {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  readCount: number;
  publishedAt: string | null;
};

type DayRow = {
  date: string;
  reads: number;
};

type CountryRow = {
  countryCode: string;
  reads: number;
};

type ProductClickRow = {
  diaryPostId: string;
  productId: string;
  brandId: string;
  position: number | null;
  clicks: number;
  post: {
    id: string;
    title: string;
    slug: string;
    readCount: number;
  } | null;
  product: {
    id: string;
    title: string;
    slug: string;
    price: string | null;
    currency: string;
    imageUrl: string | null;
  } | null;
  brand: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type PostPerformanceRow = {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  readCount: number;
  publishedAt: string | null;
  productClicks: number;
  ctr: number;
};

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
      <div className="text-xs uppercase tracking-[0.18em] text-black/45">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-black">
        {value}
      </div>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function DiaryInsightsClient() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [days, setDays] = useState<DayRow[]>([]);
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [productClicks, setProductClicks] = useState<ProductClickRow[]>([]);
  const [postPerformance, setPostPerformance] = useState<PostPerformanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function readJson(res: Response, label: string) {
      const text = await res.text();

      if (!res.ok) {
        throw new Error(`${label} failed with ${res.status}: ${text.slice(0, 200)}`);
      }

      try {
        return JSON.parse(text);
      } catch {
        throw new Error(`${label} did not return JSON. Got: ${text.slice(0, 200)}`);
      }
    }

    async function load() {
      setLoading(true);

      try {
        const [
          overviewRes,
          postsRes,
          daysRes,
          countriesRes,
          productClicksRes,
          postPerformanceRes,
        ] = await Promise.all([
          fetch(`/api/admin/analytics/diary/overview?t=${Date.now()}`, { cache: "no-store" }),
          fetch(`/api/admin/analytics/diary/by-post?t=${Date.now()}`, { cache: "no-store" }),
          fetch(`/api/admin/analytics/diary/by-day?t=${Date.now()}`, { cache: "no-store" }),
          fetch(`/api/admin/analytics/diary/by-country?t=${Date.now()}`, { cache: "no-store" }),
          fetch(`/api/admin/analytics/diary/product-clicks?range=30d&t=${Date.now()}`, { cache: "no-store" }),
          fetch(`/api/admin/analytics/diary/post-performance?range=30d&t=${Date.now()}`, { cache: "no-store" }),
        ]);

        const overviewJson = await readJson(overviewRes, "overview");
        const postsJson = await readJson(postsRes, "by-post");
        const daysJson = await readJson(daysRes, "by-day");
        const countriesJson = await readJson(countriesRes, "by-country");
        const productClicksJson = await readJson(productClicksRes, "diary-product-clicks");
        const postPerformanceJson = await readJson(postPerformanceRes, "diary-post-performance");

        setOverview({
          totalPosts: overviewJson.totalPosts ?? 0,
          publishedPosts: overviewJson.publishedPosts ?? 0,
          totalReads: overviewJson.totalReads ?? 0,
        });

        setPosts(postsJson.posts ?? []);
        setDays(daysJson.days ?? []);
        setCountries(countriesJson.countries ?? []);
        setProductClicks(productClicksJson.rows ?? []);
        setPostPerformance(postPerformanceJson.rows ?? []);
      } catch (err) {
        console.error("[DiaryInsightsClient]", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.22em] text-black/45">
          Editorial Analytics
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-black">
          Diary Insights
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-black/60">
          See which diary posts are being read, which articles drive product clicks, and where readers are coming from.
        </p>
      </div>

      {loading ? (
        <div className="rounded-[28px] border border-black/10 bg-white p-6 text-sm text-black/60 shadow-sm">
          Loading diary insights...
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Total diary posts" value={overview?.totalPosts ?? 0} />
            <StatCard label="Published posts" value={overview?.publishedPosts ?? 0} />
            <StatCard label="Total reads" value={overview?.totalReads ?? 0} />
          </div>

          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-sm">
            <div className="border-b border-black/6 px-6 py-4">
              <h3 className="text-lg font-semibold text-black">
                Editorial shopping performance
              </h3>
              <p className="mt-1 text-xs text-black/50">
                See which diary articles are turning reads into product clicks.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-black/[0.03] text-left text-black/55">
                  <tr>
                    <th className="px-6 py-4 font-medium">Diary post</th>
                    <th className="px-6 py-4 font-medium">Reads</th>
                    <th className="px-6 py-4 font-medium">Product clicks</th>
                    <th className="px-6 py-4 font-medium">CTR</th>
                    <th className="px-6 py-4 font-medium">Breakdown</th>
                  </tr>
                </thead>

                <tbody>
                  {postPerformance.length ? (
                    postPerformance.map((post) => (
                      <tr key={post.id} className="border-t border-black/6">
                        <td className="px-6 py-4">
                          <div className="font-medium text-black">{post.title}</div>
                          <div className="mt-1 text-xs text-black/45">/{post.slug}</div>
                        </td>

                        <td className="px-6 py-4 text-black/70">{post.readCount}</td>
                        <td className="px-6 py-4 text-black/70">{post.productClicks}</td>
                        <td className="px-6 py-4 text-black/70">
                          {Number(post.ctr ?? 0).toFixed(1)}%
                        </td>

                        <td className="px-6 py-4">
                          <Link
                            href={`/admin/analytics/diary/${post.id}`}
                            className="text-sm font-medium text-black underline decoration-black/20 underline-offset-4"
                          >
                            View breakdown
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-black/50">
                        No editorial product-click data yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-sm">
            <div className="border-b border-black/6 px-6 py-4">
              <h3 className="text-lg font-semibold text-black">
                Top products clicked from diary
              </h3>
              <p className="mt-1 text-xs text-black/50">
                Product clicks generated specifically from editorial related-product sections.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-black/[0.03] text-left text-black/55">
                  <tr>
                    <th className="px-6 py-4 font-medium">Product</th>
                    <th className="px-6 py-4 font-medium">Brand</th>
                    <th className="px-6 py-4 font-medium">Diary post</th>
                    <th className="px-6 py-4 font-medium">Position</th>
                    <th className="px-6 py-4 text-right font-medium">Clicks</th>
                  </tr>
                </thead>

                <tbody>
                  {productClicks.length ? (
                    productClicks.map((row) => (
                      <tr
                        key={`${row.diaryPostId}:${row.productId}:${row.position ?? "x"}`}
                        className="border-t border-black/6"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 overflow-hidden rounded-2xl border border-black/10 bg-black/5">
                              {row.product?.imageUrl ? (
                                <img
                                  src={row.product.imageUrl}
                                  alt={row.product.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>

                            <div>
                              <div className="font-medium text-black">
                                {row.product?.title ?? "Unknown product"}
                              </div>
                              {row.product?.price ? (
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

                        <td className="px-6 py-4">
                          <div className="font-medium text-black">
                            {row.post?.title ?? "Unknown post"}
                          </div>
                          <div className="mt-1 text-xs text-black/45">
                            /{row.post?.slug ?? "unknown"}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-black/70">
                          {row.position ? `Position ${row.position}` : "—"}
                        </td>

                        <td className="px-6 py-4 text-right font-medium text-black">
                          {row.clicks}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-black/50">
                        No diary product clicks yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* keep your existing read analytics below */}
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/6 px-6 py-4">
                <h3 className="text-lg font-semibold text-black">Top diary posts</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-black/[0.03] text-left text-black/55">
                    <tr>
                      <th className="px-6 py-4 font-medium">Title</th>
                      <th className="px-6 py-4 font-medium">Reads</th>
                      <th className="px-6 py-4 font-medium">Published</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.length ? (
                      posts.map((post) => (
                        <tr key={post.id} className="border-t border-black/6">
                          <td className="px-6 py-4">
                            <div className="font-medium text-black">{post.title}</div>
                            <div className="mt-1 text-xs text-black/45">/{post.slug}</div>
                            <div className="mt-2 flex gap-3">
                              <Link
                                href={`/admin/diary/${post.id}`}
                                className="text-xs text-black underline decoration-black/20 underline-offset-4"
                              >
                                Edit
                              </Link>
                              <Link
                                href={`/diary/${post.slug}`}
                                target="_blank"
                                className="text-xs text-black/60 underline decoration-black/20 underline-offset-4"
                              >
                                View
                              </Link>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-black/70">{post.readCount}</td>
                          <td className="px-6 py-4 text-black/70">{formatDate(post.publishedAt)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-black/50">
                          No diary data yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-sm">
              <div className="border-b border-black/6 px-6 py-4">
                <h3 className="text-lg font-semibold text-black">Reads by country</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-black/[0.03] text-left text-black/55">
                    <tr>
                      <th className="px-6 py-4 font-medium">Country</th>
                      <th className="px-6 py-4 font-medium">Reads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {countries.length ? (
                      countries.slice(0, 10).map((row) => (
                        <tr key={row.countryCode} className="border-t border-black/6">
                          <td className="px-6 py-4 text-black">{row.countryCode}</td>
                          <td className="px-6 py-4 text-black/70">{row.reads}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} className="px-6 py-8 text-center text-black/50">
                          No country data yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-sm">
            <div className="border-b border-black/6 px-6 py-4">
              <h3 className="text-lg font-semibold text-black">Reads by day</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-black/[0.03] text-left text-black/55">
                  <tr>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Reads</th>
                  </tr>
                </thead>
                <tbody>
                  {days.length ? (
                    days.map((row) => (
                      <tr key={row.date} className="border-t border-black/6">
                        <td className="px-6 py-4 text-black">{row.date}</td>
                        <td className="px-6 py-4 text-black/70">{row.reads}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className="px-6 py-8 text-center text-black/50">
                        No daily diary reads yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}