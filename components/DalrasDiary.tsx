import Image from "next/image";
import Link from "next/link";

export type DiaryCardItem = {
  id: string;
  title: string;
  excerpt?: string | null;
  imageUrl?: string | null;
  href: string;
};

export function DalrasDiary({ posts = [] }: { posts?: DiaryCardItem[] }) {
  const post = posts[0];
  if (!post) return null;

  return (
    <section className="bg-white">
      <div className="mx-auto w-full max-w-[1800px] px-8 pb-14 pt-4">

        {/* Section header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-black/40">
              Editorial
            </p>
            <h2 className="font-heading text-3xl font-normal tracking-tight text-black md:text-4xl">
              Veilora Diary
            </h2>
            <div className="mt-3 h-px w-12 bg-black/20" />
          </div>
          <Link
            href="/diary"
            className="text-[11px] uppercase tracking-[0.18em] text-black/50 underline underline-offset-4 hover:text-black transition-colors"
          >
            Read all
          </Link>
        </div>

        <Link href={post.href} className="group block">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="order-1 flex items-center lg:order-1 lg:col-span-5">
              <div className="text-center lg:text-left">
                <h3 className="font-display text-4xl leading-[0.98] tracking-tight text-black sm:text-5xl xl:text-6xl">
                  {post.title}
                </h3>
                <p className="mt-4 text-sm uppercase tracking-[0.18em] text-black/60">
                  Modesty takes the spotlight in a new era of style
                </p>
              </div>
            </div>

            <div className="order-2 lg:order-2 lg:col-span-7">
              <div className="relative aspect-[16/10] overflow-hidden bg-black/5">
                {post.imageUrl ? (
                  <Image
                    src={post.imageUrl}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                ) : null}
              </div>

              <div className="mt-6 max-w-2xl">
                {post.excerpt ? (
                  <p className="text-base leading-7 text-black/75 sm:text-lg">
                    {post.excerpt}
                  </p>
                ) : null}
                <div className="mt-5">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-black/50 underline underline-offset-4">
                    Read the article
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
