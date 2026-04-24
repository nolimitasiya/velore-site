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
  <section className="bg-background">
    <div className="mx-auto w-full max-w-[1800px] px-8 pb-14 pt-4">
      <Link href={post.href} className="group block">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="order-2 flex items-center lg:order-1 lg:col-span-5">
  <div className="text-center lg:text-left">
    <h2 className="font-display text-4xl leading-[0.98] tracking-tight text-black sm:text-5xl xl:text-6xl">
      {post.title}
    </h2>

    <p className="mt-4 text-sm uppercase tracking-[0.18em] text-black/60">
      Modesty Takes the Spotlight in a New Era of Style
    </p>
  </div>
</div>

          <div className="order-1 lg:order-2 lg:col-span-7">
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
                <span className="text-sm underline underline-offset-4">
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