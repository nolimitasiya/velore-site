import Image from "next/image";
import type { DemoBrandTile } from "../data/demo";

export function BrandMosaic({ tiles }: { tiles: DemoBrandTile[] }) {
  return (
    <section className="bg-[#eee]">
      <div className="mx-auto w-full max-w-[1800px] px-8 pb-2">

        {/* Section title */}
        <div className="mb-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-wide text-black">
            Shop by Brand
          </h2>
        </div>

        {/* Brand grid */}
        <div className="grid grid-cols-2 gap-0">
          {tiles.slice(0, 6).map((t) => (
            <div key={t.id} className="relative overflow-hidden bg-black/5">
              <div className="relative aspect-[3/1]">
                <Image
                  src={t.imageUrl}
                  alt={t.name}
                  fill
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black/25" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-lg font-semibold tracking-widest">
                    {t.name}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
