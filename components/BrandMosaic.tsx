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

  const visibleTiles = tiles.slice(0, 7);

  const tileClasses = [
    "md:col-span-5 md:row-span-1",
    "md:col-span-4 md:row-span-1",
    "md:col-span-3 md:row-span-2",
    "md:col-span-3 md:row-span-1",
    "md:col-span-3 md:row-span-1",
    "md:col-span-3 md:row-span-1",
    "md:col-span-3 md:row-span-1",
  ];

  return (
    <section className="bg-[#fcfbf8]">
      <div className="mx-auto w-full max-w-[1800px] px-5 py-14 md:px-8 md:py-20">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between gap-6 md:mb-10">
          <div>
            <p className="mb-3 font-body text-[11px] uppercase tracking-[0.24em] text-black/45">
              Discover
            </p>

            <h2 className="font-display text-[44px] font-normal leading-none tracking-[-0.02em] text-black md:text-[64px]">
              Emerging Brands
            </h2>

            <div className="mt-5 h-px w-20 bg-black/20" />

            
          </div>

          <Link
            href="/brands"
            className="group hidden items-center gap-5 pb-1 font-body text-[11px] uppercase tracking-[0.2em] text-black/55 transition-colors hover:text-[#7B2D3E] md:flex"
          >
            <span className="border-b border-black/25 pb-1">
              View all
            </span>
            <span className="text-xl transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>

        {/* Editorial mosaic */}
        <div className="grid auto-rows-[260px] grid-cols-1 gap-[2px] md:grid-cols-12 md:auto-rows-[330px]">
          {visibleTiles.map((tile, index) => (
            <Link
              key={tile.id}
              href={`/brands/${tile.slug}`}
              className={`group relative overflow-hidden bg-black/5 ${
                tileClasses[index] ?? "md:col-span-4"
              }`}
            >
              <Image
                src={tile.imageUrl}
                alt={tile.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-7">
                <h3 className="font-display text-[30px] font-normal leading-none tracking-[-0.01em] md:text-[38px]">
                  {tile.name}
                </h3>

                <div className="mt-4 h-px w-7 bg-white/65" />

                <div className="mt-5 flex items-center gap-5 font-body text-[10px] uppercase tracking-[0.2em] text-white/90">
                  <span className="border-b border-white/50 pb-1">
                    Discover
                  </span>

                  <span className="text-base transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile view-all */}
        <div className="mt-7 md:hidden">
          <Link
            href="/brands"
            className="flex items-center justify-between border-b border-black/15 pb-3 font-body text-[11px] uppercase tracking-[0.2em] text-black/60"
          >
            <span>View all brands</span>
            <span className="text-lg">→</span>
          </Link>
        </div>

       
      </div>
    </section>
  );
}