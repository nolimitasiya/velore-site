"use client";

// C:\Users\Asiya\projects\dalra\app\b\[brandSlug]\p\[productSlug]\ImageGallery.tsx

import { useState } from "react";
import Image from "next/image";

const BADGE_LABELS: Record<string, string> = {
  bestseller: "Bestseller",
  new_in: "New in",
  editor_pick: "Editor's pick",
  modest_essential: "Modest essential",
  limited_stock: "Limited stock",
  sale: "Sale",
  ramadan_edit: "Ramadan edit",
  eid_edit: "Eid edit",
  workwear: "Workwear",
  next_day: "Next day",
};

export default function ImageGallery({
  images,
  title,
  badges,
}: {
  images: string[];
  title: string;
  badges: string[];
}) {
  const [active, setActive] = useState(0);

  const displayBadges = badges.filter((b) => BADGE_LABELS[b]);

  return (
    <div className="flex flex-col gap-3">
      {/* Main image */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[28px] bg-black/5">
        {images[active] ? (
          <Image
            src={images[active]}
            alt={title}
            fill
            className="object-cover transition-opacity duration-200"
            sizes="(max-width: 1024px) 100vw, 60vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-sm text-black/30">
            No image
          </div>
        )}

        {/* Badges */}
        {displayBadges.length > 0 && (
          <div className="absolute left-4 top-4 flex flex-col gap-2">
            {displayBadges.map((b) => (
              <span
                key={b}
                className="rounded-full bg-white/90 border border-black/10 px-3 py-1 text-[10px] font-semibold tracking-wider"
              >
                {BADGE_LABELS[b].toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((url, i) => (
            <button
              key={i}
              type="button"
              aria-label={`View ${title} image ${i + 1}`}
              onClick={() => setActive(i)}
              className={[
                "relative h-20 w-16 shrink-0 overflow-hidden rounded-2xl border-2 transition-all",
                active === i
                  ? "border-black"
                  : "border-transparent hover:border-black/20",
              ].join(" ")}
            >
              <Image
                src={url}
                alt={`${title} image ${i + 1}`}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
