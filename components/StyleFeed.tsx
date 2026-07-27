import Image from "next/image";

export type StyleFeedPost = {
  id: string;
  imageUrl: string;
  imageAlt?: string | null;
  imageFocalX?: number | null;
  imageFocalY?: number | null;
  brandName?: string | null;
  brandInstagramHandle?: string | null;
  brandInstagramUrl?: string | null;
  caption?: string | null;
  permalink?: string | null;
  postedAt?: string | null;
};

export function StyleFeed({ posts }: { posts: StyleFeedPost[] }) {
  return (
    <section className="bg-white">
      <div className="mx-auto w-full max-w-[1800px] px-8 pb-10">
        {/* Section header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="mb-3 font-body text-[11px] uppercase tracking-[0.24em] text-black/45">
              Inspiration
            </p>

            <h2 className="font-display text-[36px] font-normal leading-none tracking-[-0.02em] text-black md:text-[56px]">
              The Style Feed
            </h2>

            <div className="mt-5 h-px w-20 bg-black/20" />
          </div>
        </div>

        {/* Feed */}
        <div className="grid justify-center gap-5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] md:gap-6">
          {posts.map((post) => {
            const href = post.permalink || post.brandInstagramUrl || null;
            const Wrapper: any = href ? "a" : "div";

            const wrapperProps = href
              ? {
                  href,
                  target: "_blank",
                  rel: "noopener noreferrer",
                }
              : {};

            const focalX =
              typeof post.imageFocalX === "number" ? post.imageFocalX : 50;

            const focalY =
              typeof post.imageFocalY === "number" ? post.imageFocalY : 50;

            return (
              <Wrapper
                key={post.id}
                {...wrapperProps}
                className="group block"
              >
                <article>
                  <div className="relative aspect-[4/5] overflow-hidden bg-black/5">
                    <Image
                      src={post.imageUrl}
                      alt={
                        post.imageAlt ||
                        (post.brandName
                          ? `${post.brandName} style post`
                          : "Style post")
                      }
                      fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                      style={{
                        objectPosition: `${focalX}% ${focalY}%`,
                      }}
                    />

                    {/* Desktop hover overlay */}
                    <div className="absolute inset-0 hidden bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 md:block" />

                    <div className="absolute inset-x-0 bottom-0 hidden translate-y-4 p-6 text-white opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 md:block">
                      {post.brandName ? (
                        <h3 className="font-display text-[28px] font-normal leading-none">
                          {post.brandName}
                        </h3>
                      ) : null}

                      {post.caption ? (
                        <p className="mt-3 line-clamp-3 font-body text-[13px] leading-5 text-white/85">
                          {post.caption}
                        </p>
                      ) : null}

                      <div className="mt-5 flex items-center gap-4 font-body text-[10px] uppercase tracking-[0.2em] text-white/90">
                        <span className="border-b border-white/50 pb-1">
                          View post
                        </span>

                        <span className="text-base transition-transform duration-300 group-hover:translate-x-1">
                          →
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile details */}
                  <div className="pt-4 md:hidden">
                    {post.brandName ? (
                      <h3 className="font-display text-[24px] font-normal leading-none text-black">
                        {post.brandName}
                      </h3>
                    ) : null}

                    {post.caption ? (
                      <p className="mt-2 line-clamp-2 font-body text-[14px] leading-6 text-black/65">
                        {post.caption}
                      </p>
                    ) : null}

                    <div className="mt-4 flex items-center gap-3">
                      <span className="font-body text-[10px] uppercase tracking-[0.18em] text-black/50">
                        View post
                      </span>

                      <span className="text-black/40">→</span>
                    </div>
                  </div>
                </article>
              </Wrapper>
            );
          })}
        </div>
      </div>
    </section>
  );
}