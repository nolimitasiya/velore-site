import Image from "next/image";
import Link from "next/link";
import type { DemoDiaryPost } from "../data/demo";

export function DalrasDiary({ posts = [] }: { posts?: DemoDiaryPost[] }) {
  return (
    <section className="bg-[#eee]">
      <div className="mx-auto w-full max-w-[1800px] px-8 py-16">
        <div className="text-center mb-10">
          <h2 className="font-display text-2xl sm:text-3xl text-black">
            The Veilora Club Diary
          </h2>
          <p className="mt-2 text-sm text-black/60">
            Editorial notes on modest style, global brands, and timeless silhouettes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {posts.slice(0, 3).map((p) => (
            <Link
              key={p.id}
              href={p.href}
              className="group bg-white/60 border border-black/10 overflow-hidden"
            >
              <div className="relative aspect-[4/3] bg-black/5">
                <Image
                  src={p.imageUrl}
                  alt={p.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>

              <div className="p-5">
                <div className="font-display text-lg text-black">{p.title}</div>
                {p.excerpt && (
                  <div className="mt-2 text-sm text-black/70">{p.excerpt}</div>
                )}
                <div className="mt-4 text-xs tracking-widest text-black/70">
                  READ MORE →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
