import Image from "next/image";
import type { DemoPost } from "../data/demo";

export function StyleFeed({ posts }: { posts: DemoPost[] }) {
  diary: [
  {
    id: "d1",
    title: "Winter neutrals, the modest way",
    excerpt: "Layering formulas that always look polished — without trying too hard.",
    imageUrl: "/home/diary-1.jpg",
    href: "/diary/winter-neutrals",
  },
  {
    id: "d2",
    title: "The Paris edit: effortless coverage",
    excerpt: "A soft, feminine silhouette guide inspired by city style.",
    imageUrl: "/home/diary-2.jpg",
    href: "/diary/paris-edit",
  },
  {
    id: "d3",
    title: "Occasion dressing without the stress",
    excerpt: "Three go-to outfits that work for weddings, dinners and Eid.",
    imageUrl: "/home/diary-3.jpg",
    href: "/diary/occasion-dressing",
  },
]
  return (
    <section className="bg-[#eee]">
      <div className="mx-auto w-full max-w-[1800px] px-8 pb-16">
        <div className="py-8 text-center">
          <h2 className="text-2xl font-semibold text-black">The Style Feed</h2>
        </div>

        <div
  className="
    grid gap-6
    [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]
    justify-center
  "
>

          {posts.map((p) => (
            <article
              key={p.id}
              className="bg-white/60 border border-black/10"
            >
              <div className="relative aspect-[4/5] bg-black/5">
                <Image
                  src={p.imageUrl}
                  alt={p.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-3 text-xs text-black/90">
                {p.title}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
