import Image from "next/image";

export type StyleFeedPost = {
  id: string;
  imageUrl: string;
  caption?: string | null;
  permalink?: string | null;
  postedAt?: string | null;
};

export function StyleFeed({ posts }: { posts: StyleFeedPost[] }) {
  return (
    <section className="bg-[#eee]">
      <div className="mx-auto w-full max-w-[1800px] px-8 pb-16">
        <div className="py-8 text-center">
          <h2 className="text-2xl font-semibold text-black">The Style Feed</h2>
        </div>

        <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] justify-center">
          {posts.map((p) => {
            const Wrapper: any = p.permalink ? "a" : "div";
            const wrapperProps = p.permalink
              ? { href: p.permalink, target: "_blank", rel: "noreferrer" }
              : {};

            return (
              <Wrapper
                key={p.id}
                {...wrapperProps}
                className="block bg-white/60 border border-black/10 hover:bg-white/80 transition-colors"
              >
                <div className="relative aspect-[4/5] bg-black/5">
                  <Image src={p.imageUrl} alt="Style post" fill className="object-cover" />
                </div>

                {p.caption ? (
                  <div className="p-3 text-xs text-black/90 line-clamp-2">{p.caption}</div>
                ) : (
                  <div className="p-3 text-xs text-black/60"> </div>
                )}
              </Wrapper>
            );
          })}
        </div>
      </div>
    </section>
  );
}
