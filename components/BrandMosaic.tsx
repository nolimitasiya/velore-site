// C:\Users\Asiya\projects\dalra\components\BrandMosaic.tsx
import Image from "next/image";
import Link from "next/link";

export type StorefrontBrandTile = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
};

export function BrandMosaic({ tiles }: { tiles: StorefrontBrandTile[] }) {
  if (!tiles.length) return null;

  return (
    <section className="bg-white">
      <div className="mx-auto w-full max-w-[1800px] px-8 pt-8 pb-14">

        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-black/40">
              Discover
            </p>
            <h2 className="mt-2 font-heading text-3xl tracking-tight text-black md:text-4xl">
              Emerging Brands
            </h2>
          </div>
          <Link
            href="/brands"
            className="text-xs uppercase tracking-[0.18em] text-black/50 underline underline-offset-4 hover:text-black transition-colors"
          >
            View all
          </Link>
        </div>

        {/* Mosaic grid */}
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          {tiles.slice(0, 4).map((t, i) => (
            <Link
              key={t.id}
              href={`/brands/${t.slug}`}
              className="group relative overflow-hidden rounded-2xl bg-black/5"
            >
              <div className="relative aspect-[16/7]">
                <Image
                  src={t.imageUrl}
                  alt={t.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                {/* Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />

                {/* Brand name — bottom left */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  
                  <p className="text-white text-base font-medium tracking-wide">
                    {t.name}
                  </p>
                </div>

                {/* Hover arrow */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="rounded-full bg-white/20 backdrop-blur-sm border border-white/30 w-8 h-8 flex items-center justify-center text-white text-sm">
                    →
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
