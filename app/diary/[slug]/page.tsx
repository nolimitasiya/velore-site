import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DiaryReadTracker from "@/components/diary/DiaryReadTracker";
import SiteShell from "@/components/SiteShell";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function safeJsonToHtml(contentJson: unknown): string {
  if (!contentJson) return "";
  return "";
}

function formatMoney(value: string | number | null, currency: string | null) {
  if (value == null || !currency) return null;

  const amount = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(amount)) return null;

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function estimateReadTimeMinutes(html: string) {
  const text = stripHtml(html);
  const words = text ? text.split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

export default async function DiaryPostPage({ params }: PageProps) {
  const { slug } = await params;

  const post = await prisma.diaryPost.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
    },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
      },
      relatedProducts: {
        orderBy: { sortOrder: "asc" },
        include: {
          product: {
            include: {
              brand: {
                select: {
                  name: true,
                },
              },
              images: {
                orderBy: { sortOrder: "asc" },
                take: 1,
                select: {
                  url: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!post) {
    notFound();
  }

  const html = post.contentHtml || safeJsonToHtml(post.contentJson);
  const readTime = estimateReadTimeMinutes(html);

  return (
    <SiteShell>
      <main className="bg-white text-black">
        <DiaryReadTracker diaryPostId={post.id} />

        <article className="mx-auto w-full max-w-4xl px-6 pt-12 pb-6 md:px-8 md:pt-16 md:pb-8">
          <div className="mb-8 text-center">
            <h1 className="font-display text-4xl tracking-[0.01em] text-black md:text-5xl">
              {post.title}
            </h1>

            {post.excerpt ? (
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-black/70 md:text-lg">
                {post.excerpt}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-black/50">
              {post.publishedAt ? (
                <span>
                  {new Date(post.publishedAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              ) : null}

              {post.editorName ? (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span>
                    Editor: <span className="text-black/70">{post.editorName}</span>
                  </span>
                </>
              ) : null}

              <>
                <span className="hidden sm:inline">•</span>
                <span>{readTime}</span>
              </>
            </div>
          </div>

          {post.coverImageUrl ? (
            <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-3xl border border-black/10 bg-black/5">
              <Image
                src={post.coverImageUrl}
                alt={post.coverImageAlt || post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          ) : null}

          {html ? (
            <div
              className="prose prose-neutral max-w-none prose-headings:font-display prose-headings:text-black prose-p:text-black/80 prose-p:leading-8 prose-li:text-black/80 prose-strong:text-black prose-a:text-black prose-a:underline prose-a:decoration-black/30"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <div className="rounded-3xl border border-black/10 bg-neutral-50 p-6 text-black/60">
              This diary post does not have content yet.
            </div>
          )}

          {post.images.length > 0 ? (
            <section className="mt-12">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {post.images.map((img) => (
                  <figure
                    key={img.id}
                    className="overflow-hidden rounded-3xl border border-black/10 bg-white"
                  >
                    <div className="relative aspect-[4/3] bg-black/5">
                      <Image
                        src={img.imageUrl}
                        alt={img.altText || post.title}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {img.caption ? (
                      <figcaption className="px-4 py-3 text-sm text-black/60">
                        {img.caption}
                      </figcaption>
                    ) : null}
                  </figure>
                ))}
              </div>
            </section>
          ) : null}
        </article>

                {post.relatedProducts.length > 0 ? (
          <section className="border-t border-black/10 bg-white">
            <div className="mx-auto w-full max-w-[1800px] px-6 py-12 md:px-8 md:py-14">
              <div className="mb-8 text-center">
                                <p className="text-[11px] uppercase tracking-[0.22em] text-black/45">
                  {post.shopSectionEyebrow || "Shop the Edit"}
                </p>
                <h2 className="mt-3 font-display text-3xl tracking-[0.02em] text-black md:text-4xl">
                  {post.shopSectionTitle || "Inspired by this story"}
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-black/60">
                  {post.shopSectionSubtitle ||
                    "A curated selection to complement the editorial."}
                </p>
              </div>

              <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-4">
                {post.relatedProducts.map(({ product }) => {
                  const imageUrl = product.images[0]?.url ?? null;
                  const price = formatMoney(
                    product.price ? product.price.toString() : null,
                    product.currency ?? null
                  );

                  return (
                    <article key={product.id} className="group">
                      <Link href={`/out/${product.id}`} className="block">
                        <div className="relative aspect-[4/4.8] overflow-hidden rounded-[20px] bg-black/5">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={product.title}
                              fill
                              className="object-cover transition duration-500 group-hover:scale-[1.02]"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm text-black/35">
                              No image
                            </div>
                          )}
                        </div>

                        <div className="pt-4 text-center">
                          {product.brand?.name ? (
                            <p className="text-[11px] uppercase tracking-[0.18em] text-black/45">
                              {product.brand.name}
                            </p>
                          ) : null}

                          <h3 className="mt-2 text-sm leading-6 text-black">
                            {product.title}
                          </h3>

                          {price ? (
                            <p className="mt-1 text-sm text-black/65">{price}</p>
                          ) : null}
                        </div>
                      </Link>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </SiteShell>
  );
}