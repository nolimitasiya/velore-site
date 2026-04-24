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
    <section className="bg-background">
      <div className="mx-auto w-full max-w-[1800px] px-8 pb-6">
        <div className="pt-0 pb-8 text-center">
          <h2 className="text-4xl font-semibold text-black">The Style Feed</h2>
        </div>

        <div className="grid justify-center gap-6 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {posts.map((p) => {
            const href = p.permalink || p.brandInstagramUrl || null;
            const Wrapper: any = href ? "a" : "div";
            const wrapperProps = href
              ? {
                  href,
                  target: "_blank",
                  rel: "noopener noreferrer",
                }
              : {};

            const focalX =
              typeof p.imageFocalX === "number" ? p.imageFocalX : 50;
            const focalY =
              typeof p.imageFocalY === "number" ? p.imageFocalY : 50;

            return (
              <Wrapper
                key={p.id}
                {...wrapperProps}
                className="block border border-black/10 bg-white/60 transition-colors hover:bg-white/80"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-black/5">
                  <Image
                    src={p.imageUrl}
                    alt={
                      p.imageAlt ||
                      (p.brandName ? `${p.brandName} style post` : "Style post")
                    }
                    fill
                    className="object-cover"
                    style={{
                      objectPosition: `${focalX}% ${focalY}%`,
                    }}
                  />
                </div>

                <div className="space-y-2 p-3">
                  {p.brandName ? (
                    <div className="text-xs font-medium uppercase tracking-[0.14em] text-black/55">
                      {p.brandName}
                    </div>
                  ) : null}

                  {p.caption ? (
                    <div className="line-clamp-2 text-xs text-black/90">
                      {p.caption}
                    </div>
                  ) : (
                    <div className="text-xs text-black/60" />
                  )}
                </div>
              </Wrapper>
            );
          })}
        </div>
      </div>
    </section>
  );
}