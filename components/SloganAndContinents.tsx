"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { DemoContinent } from "../data/demo";

export function SloganAndContinents({
  slogan,
  continents,
}: {
  slogan: string;
  continents: DemoContinent[];
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;

    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(
      el.scrollLeft + el.clientWidth < el.scrollWidth - 10
    );
  }

  function scrollBy(amount: number) {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  }

  return (
    <section className="bg-[#eee]">
      <div className="w-full px-6 pb-10">


      {/* Slogan */}
<div className="text-center mb-10">
  <div className="font-semibold text-2xl sm:text-3xl text-black tracking-wide">
    {slogan}
  </div>
</div>





        <div className="relative">
          {/* Scroll area */}
          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            className="
              flex gap-4 overflow-x-auto pb-4
              snap-x snap-mandatory
              scrollbar-hide
            "
          >
            {continents.map((c) => (
              <Link
                key={c.key}
                href={`/continent/${c.key}`}
                className="group relative shrink-0 w-[260px] sm:w-[300px] lg:w-[340px]"
              >
                <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-black/5">
                  <Image
                    src={c.imageUrl}
                    alt={c.label}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-black/25" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-display text-white text-xl sm:text-2xl font-semibold tracking-wide drop-shadow">
                      {c.label}
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
              className="
                absolute left-3 top-1/2 -translate-y-1/2 z-10
                rounded-full bg-white/40 backdrop-blur
                px-3 py-1.5 text-black shadow
                hover:bg-white transition
              "
            >
              ←
            </button>
          )}

          {/* Right arrow */}
          {canScrollRight && (
            <button
              onClick={() => scrollBy(280)}
              aria-label="Scroll right"
              className="
                absolute right-3 top-1/2 -translate-y-1/2 z-10
                flex items-center gap-1
                rounded-full bg-white/40 backdrop-blur
                px-3 py-1.5 text-black shadow
                hover:bg-white transition
              "
            >
              <span className="hidden sm:inline text-xs">Scroll</span> →
            </button>
          )}

          {/* Edge fade */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-[#eee] to-transparent" />
          <div className="pointer-events-none absolute left-0 top-0 h-full w-16 bg-gradient-to-r from-[#eee] to-transparent" />
        </div>
      </div>
    </section>
  );
}
