import Link from "next/link";

type Props = {
  params?: { category?: string };
};

function titleize(slug?: string) {
  const safe = slug ?? "category";
  return safe
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export default function CategoryPage({ params }: Props) {
  const name = titleize(params?.category);
 

  return (
    <div className="mx-auto w-full max-w-[1800px] px-8 py-10">
      <header className="text-center">
        <h1 className="font-heading text-4xl tracking-[0.08em]">{name}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-black/60">
          This section is coming soon. We’re curating the best modest picks across brands.
        </p>
      </header>

      <div className="mt-10 flex flex-col items-center gap-4">
        <Link
          href="/brands"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)] px-5 py-2 text-sm text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-white"
        >
          Shop by Brands <span>→</span>
        </Link>

        <Link
          href="/categories/clothing"
          className="text-sm text-black/60 underline transition-colors hover:text-[var(--accent)]"
        >
          Back to Clothing
        </Link>
      </div>
    </div>
  );
}
