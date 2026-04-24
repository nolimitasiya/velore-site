import Image from "next/image";
import Link from "next/link";
import type { MouseEvent as ReactMouseEvent } from "react";

export type StorefrontHeroData = {
  id?: string;
  title?: string | null;
  subtitle?: string | null;
  desktopImageUrl: string;
  mobileImageUrl?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  overlayOpacity?: number | null;
  focalX?: number | null;
  focalY?: number | null;
  textAlign?: "LEFT" | "CENTER" | "RIGHT" | null;
  textX?: number | null;
  textY?: number | null;
  isActive?: boolean;
};

type HeroProps = {
  hero: StorefrontHeroData;
  preview?: boolean;
  textDraggable?: boolean;
  isDraggingText?: boolean;
  onTextMouseDown?: (e: ReactMouseEvent<HTMLDivElement>) => void;
  className?: string;
  priority?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function Hero({
  hero,
  preview = false,
  textDraggable = false,
  isDraggingText = false,
  onTextMouseDown,
  className = "",
  priority = true,
}: HeroProps) {
  const safeOverlayOpacity = clamp(hero.overlayOpacity ?? 20, 0, 100);
  const safeFocalX = clamp(hero.focalX ?? 50, 0, 100);
  const safeFocalY = clamp(hero.focalY ?? 50, 0, 100);
  const safeTextX = clamp(hero.textX ?? 20, 0, 100);
  const safeTextY = clamp(hero.textY ?? 62, 0, 100);
  const safeTextAlign = hero.textAlign ?? "LEFT";

  const imagePosition = `${safeFocalX}% ${safeFocalY}%`;

  const textTransform =
    safeTextAlign === "CENTER"
      ? "translate(-50%, -50%)"
      : safeTextAlign === "RIGHT"
        ? "translate(-100%, -50%)"
        : "translate(0, -50%)";

  const textClassName =
    safeTextAlign === "CENTER"
      ? "items-center text-center"
      : safeTextAlign === "RIGHT"
        ? "items-end text-right"
        : "items-start text-left";

  return (
    <section className={`bg-[#eee] ${className}`}>
      <div className="relative w-full">
        <div className="relative h-[420px] w-full overflow-hidden sm:h-[600px]">
          <div className="absolute inset-0 sm:hidden">
            <Image
              src={hero.mobileImageUrl || hero.desktopImageUrl}
              alt={hero.title || "Dalra hero"}
              fill
              priority={priority}
              className="object-cover"
              style={{ objectPosition: imagePosition }}
            />
          </div>

          <div className="absolute inset-0 hidden sm:block">
            <Image
              src={hero.desktopImageUrl}
              alt={hero.title || "Dalra hero"}
              fill
              priority={priority}
              className="object-cover"
              style={{ objectPosition: imagePosition }}
            />
          </div>

          <div
            className="absolute inset-0 bg-black"
            style={{ opacity: safeOverlayOpacity / 100 }}
          />

          <div className="relative z-10 h-full">
            <div
              data-hero-text-drag={textDraggable ? "true" : undefined}
              className={`absolute z-10 flex max-w-2xl flex-col text-white ${textClassName} ${
                textDraggable ? (isDraggingText ? "cursor-move" : "cursor-grab") : ""
              }`}
              style={{
                left: `${safeTextX}%`,
                top: `${safeTextY}%`,
                transform: textTransform,
              }}
              onMouseDown={textDraggable ? onTextMouseDown : undefined}
            >
              {hero.title ? (
                <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                  {hero.title}
                </h1>
              ) : null}

              {hero.subtitle ? (
                <p className="mt-4 max-w-xl text-sm leading-6 text-white/85 sm:text-base">
                  {hero.subtitle}
                </p>
              ) : null}

              {hero.ctaLabel ? (
                <div className="mt-6">
                  {preview || !hero.ctaHref ? (
                    <div className="inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-medium text-black">
                      {hero.ctaLabel}
                    </div>
                  ) : (
                    <Link
                      href={hero.ctaHref}
                      className="inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-medium text-black transition hover:bg-white/90"
                    >
                      {hero.ctaLabel}
                    </Link>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}