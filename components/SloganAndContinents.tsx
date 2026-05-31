// C:\Users\Asiya\projects\dalra\components\SloganAndContinents.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useEffect } from "react";

type ContinentCard = {
  slug: string;
  name: string;
  imageUrl: string;
};

export function SloganAndContinents({
  slogan,
  continents,
}: {
  slogan: string;
  continents: ContinentCard[];
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }

  function scrollBy(amount: number) {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  }
  useEffect(() => {
  updateScrollState();
}, []);

  return (
    <section className="bg-white">
      <div className="w-full px-6 pb-12">

       {/* Slogan */}
<div className="mt-16 mb-8">
  <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-black/40">
    Shop by region
  </p>
  <h2 className="font-heading text-3xl font-normal tracking-tight text-black md:text-4xl">
    Discover the world
  </h2>
  <div className="mt-3 h-px w-12 bg-black/20" />
</div>

        <div className="relative">
          {/* Scroll area */}
          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
          >
            {continents.map((c) => (
              <Link
                key={c.slug}
                href={`/continent/${c.slug}`}
                className="group relative shrink-0 w-[220px] sm:w-[260px] lg:w-[300px]"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-black/5">
                  <Image
                    src={c.imageUrl}
                    alt={c.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  {/* Gradient overlay — bottom heavy */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  
                  {/* Name — bottom left, editorial style */}
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <span className="text-white text-sm uppercase tracking-[0.2em] font-medium">
                      {c.name}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Left arrow */}
          {canScrollLeft && (
            <button
              onClick={() => scrollBy(-280)}
              aria-label="Scroll left"
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white border border-black/10 shadow-sm w-9 h-9 flex items-center justify-center text-black hover:bg-black hover:text-white transition-colors"
            >
              ←
            </button>
          )}

          {/* Right arrow */}
          {canScrollRight && (
            <button
              onClick={() => scrollBy(280)}
              aria-label="Scroll right"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white border border-black/10 shadow-sm w-9 h-9 flex items-center justify-center text-black hover:bg-black hover:text-white transition-colors"
            >
              →
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
