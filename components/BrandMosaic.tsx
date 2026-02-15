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
  return (
    <section className="bg-[#eee]">
      <div className="mx-auto w-full max-w-[1800px] px-8 pb-2">
        <div className="mb-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-wide text-black">
            Shop by Brand
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-0">
          {tiles.slice(0, 6).map((t) => (
            <Link
              key={t.id}
              href={`/brands/${t.slug}`}
              className="relative overflow-hidden bg-black/5 group"
            >
              <div className="relative aspect-[3/1]">
                <Image
                  src={t.imageUrl}
                  alt={t.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 bg-black/25" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-lg font-semibold tracking-widest">
                    {t.name}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
