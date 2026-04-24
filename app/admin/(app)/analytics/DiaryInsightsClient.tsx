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

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
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
    const [overviewRes, postsRes, daysRes, countriesRes] = await Promise.all([
      fetch(`/api/admin/analytics/diary/overview?t=${Date.now()}`, { cache: "no-store" }),
      fetch(`/api/admin/analytics/diary/by-post?t=${Date.now()}`, { cache: "no-store" }),
      fetch(`/api/admin/analytics/diary/by-day?t=${Date.now()}`, { cache: "no-store" }),
      fetch(`/api/admin/analytics/diary/by-country?t=${Date.now()}`, { cache: "no-store" }),
    ]);

    const overviewJson = await readJson(overviewRes, "overview");
    const postsJson = await readJson(postsRes, "by-post");
    const daysJson = await readJson(daysRes, "by-day");
    const countriesJson = await readJson(countriesRes, "by-country");

    setOverview({
      totalPosts: overviewJson.totalPosts ?? 0,
      publishedPosts: overviewJson.publishedPosts ?? 0,
      totalReads: overviewJson.totalReads ?? 0,
    });

    setPosts(postsJson.posts ?? []);
    setDays(daysJson.days ?? []);
    setCountries(countriesJson.countries ?? []);
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
          See which diary posts are being read, when readership is growing, and where readers are coming from.
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