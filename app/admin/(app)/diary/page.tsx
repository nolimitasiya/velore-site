import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth/AdminSession";
import { unstable_noStore as noStore } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function StatusPill({ status }: { status: "DRAFT" | "PUBLISHED" }) {
  const cls =
    status === "PUBLISHED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

export default async function AdminDiaryPage() {
  noStore(); //
  await requireAdminSession();

  const posts = await prisma.diaryPost.findMany({
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      readCount: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-black/45">
              Editorial
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-black">
              Diary
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-black/60">
              Write, manage, and publish Veilora diary articles.
            </p>
          </div>

          <Link
            href="/admin/diary/new"
            className="inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            New post
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-black/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-black/[0.03] text-left text-black/55">
              <tr>
                <th className="px-6 py-4 font-medium">Title</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Reads</th>
                <th className="px-6 py-4 font-medium">Published</th>
                <th className="px-6 py-4 font-medium">Updated</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {posts.length ? (
                posts.map((post) => (
                  <tr key={post.id} className="border-t border-black/6">
                    <td className="px-6 py-5 align-top">
                      <div className="font-medium text-black">{post.title}</div>
                      <div className="mt-1 text-xs text-black/45">/{post.slug}</div>
                    </td>

                    <td className="px-6 py-5 align-top">
                      <StatusPill status={post.status} />
                    </td>

                    <td className="px-6 py-5 align-top text-black/70">
                      {post.readCount}
                    </td>

                    <td className="px-6 py-5 align-top text-black/70">
                      {formatDate(post.publishedAt)}
                    </td>

                    <td className="px-6 py-5 align-top text-black/70">
                      {formatDate(post.updatedAt)}
                    </td>

                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-wrap gap-3">
                        <Link
                          href={`/admin/diary/${post.id}`}
                          className="text-sm font-medium text-black underline decoration-black/20 underline-offset-4"
                        >
                          Edit
                        </Link>

                        <Link
                          href={`/diary/${post.slug}`}
                          className="text-sm font-medium text-black/60 underline decoration-black/20 underline-offset-4"
                          target="_blank"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-black/50">
                    No diary posts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}