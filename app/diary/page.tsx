export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import Image from "next/image";
import Link from "next/link";
import SiteShell from "@/components/SiteShell";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date | string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default async function DiaryIndexPage() {
  const posts = await prisma.diaryPost.findMany({
    where: {
      status: "PUBLISHED",
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      coverImageUrl: true,
      coverImageAlt: true,
      publishedAt: true,
    },
  });

  return (
    <SiteShell>
      <main className="min-h-screen w-full bg-white text-black">
        <section className="border-b border-black/8 bg-white">
  <div className="mx-auto w-full max-w-[1800px] px-8 py-14 text-center md:py-20">
    <p className="text-xs uppercase tracking-[0.25em] text-black/45">
      Editorial
    </p>
    <h1 className="mt-3 font-display text-5xl tracking-[0.06em] md:text-6xl">
      The Veilora Club Diary
    </h1>
    <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-black/65 md:text-base">
      Thoughtful editorial stories, modest style inspiration, and curated
      features from Veilora Club.
    </p>
  </div>
</section>

        <section className="mx-auto w-full max-w-[1800px] px-8 py-10 md:py-10">
          {posts.length === 0 ? (
            <div className="rounded-[28px] border border-black/10 bg-white p-8 text-black/60 shadow-sm">
              No editorial articles have been published yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
  {posts.map((post) => (
    <article
      key={post.id}
      className="group overflow-hidden rounded-[28px] bg-white transition duration-300 hover:-translate-y-1"
    >
      <Link href={`/diary/${post.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] bg-black/5">
          {post.coverImageUrl ? (
            <Image
              src={post.coverImageUrl}
              alt={post.coverImageAlt || post.title}
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-black/35">
              No cover image
            </div>
          )}
        </div>

        <div className="px-2 pt-5">
          {post.publishedAt ? (
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/45">
              {formatDate(post.publishedAt)}
            </p>
          ) : null}

          <h2 className="mt-3 font-display text-3xl leading-tight tracking-[0.02em] text-black">
            {post.title}
          </h2>

          {post.excerpt ? (
            <p className="mt-3 max-w-[34ch] text-sm leading-7 text-black/65">
              {post.excerpt}
            </p>
          ) : null}

          <div className="mt-5 inline-flex border-b border-black pb-1 text-[11px] uppercase tracking-[0.16em] text-black">
            Read article
          </div>
        </div>
      </Link>
    </article>
  ))}
</div>
          )}
        </section>
      </main>
    </SiteShell>
  );
}