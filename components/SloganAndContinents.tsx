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
      <div className="mx-auto w-full max-w-[1800px] px-8 pb-12">

       {/* Section heading */}
<div className="mt-16 mb-10">
  <p className="mb-3 font-body text-[11px] uppercase tracking-[0.24em] text-black/45">
    Shop by Region
  </p>

  <h2 className="font-display text-[36px] font-normal leading-none tracking-[-0.02em] text-black md:text-[56px]">
    Discover the World
  </h2>

  <div className="mt-5 h-px w-20 bg-black/20" />
</div>

        <div className="relative">
          {/* Scroll area */}
          <div
  ref={scrollRef}
  onScroll={updateScrollState}
  className="overflow-x-auto pb-4 scrollbar-hide"
>
  <div className="mx-auto flex w-max gap-3 snap-x snap-mandatory">
    {continents.map((c) => (
      <Link
        key={c.slug}
        href={`/continent/${c.slug}?src=CONTINENT`}
        className="group relative w-[220px] shrink-0 snap-start sm:w-[260px] lg:w-[300px]"
      >
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-black/5">
          <Image
            src={c.imageUrl}
            alt={c.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-5">
            <span className="text-sm font-medium uppercase tracking-[0.2em] text-white">
              {c.name}
            </span>
          </div>
        </div>
      </Link>
    ))}
  </div>
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
