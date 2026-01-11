import Link from "next/link";

export const metadata = {
  title: "Clothing | Dalra",
  description: "Explore modest clothing curated across brands.",
};

const tiles = [
  { title: "Abayas", href: "/categories/abayas" },
  { title: "Dresses", href: "/categories/dresses" },
  { title: "Sets", href: "/categories/sets" },
  { title: "Tops", href: "/categories/tops" },
  { title: "Skirts", href: "/categories/skirts" },
  { title: "Outerwear", href: "/categories/outerwear" },
];

export default function ClothingPage() {
  return (
    <div className="mx-auto w-full max-w-[1800px] px-8 py-10">
      <header className="text-center">
        <h1 className="font-heading text-4xl tracking-[0.08em]">Clothing</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-black/60">
          Curated modest essentials across brands. Explore by category.
        </p>
      </header>

      <section className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="group rounded-3xl border bg-white/60 p-6 transition-colors hover:bg-white"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-2xl tracking-[0.04em]">
                {t.title}
              </h2>
              <span className="text-black/40 transition-colors group-hover:text-[var(--accent)]">
                →
              </span>
            </div>
            <div className="mt-2 text-sm text-black/60">
              Browse {t.title.toLowerCase()} across brands.
            </div>

            <div className="mt-5 h-px w-full bg-black/10" />
            <div className="mt-4 text-xs text-black/50 group-hover:text-[var(--accent)] transition-colors">
              Explore
            </div>
          </Link>
        ))}
      </section>

      <div className="mt-14 text-center">
        <Link
          href="/brands"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)] px-5 py-2 text-sm text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-white"
        >
          Shop by Brands <span>→</span>
        </Link>
      </div>
    </div>
  );
}
