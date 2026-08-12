"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import MoneyLabel from "@/components/MoneyLabel";

export type StyleFeedPost = {
  id: string;
  imageUrl: string;
  imageAlt?: string | null;
  imageFocalX?: number | null;
  imageFocalY?: number | null;
  brandName?: string | null;
  brandInstagramHandle?: string | null;
  brandInstagramUrl?: string | null;
  caption?: string | null;
  permalink?: string | null;
  postedAt?: string | null;

  products?: {
  id: string;
  title: string;
  slug: string;
  price: string | null;
  currency: string;
  brandName: string;
  brandSlug: string;
  imageUrl: string | null;
}[];
};

export function StyleFeed({ posts }: { posts: StyleFeedPost[] }) {

const [selectedPost, setSelectedPost] = useState<StyleFeedPost | null>(null);

useEffect(() => {
  if (!selectedPost) return;

  const previousOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      setSelectedPost(null);
    }
  }

  window.addEventListener("keydown", onKeyDown);

  return () => {
    document.body.style.overflow = previousOverflow;
    window.removeEventListener("keydown", onKeyDown);
  };
}, [selectedPost]);

  return (
    <section className="bg-white">
      <div className="mx-auto w-full max-w-[1800px] px-8 pb-10">
        {/* Section header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="mb-3 font-body text-[11px] uppercase tracking-[0.24em] text-black/45">
              Inspiration
            </p>

            <h2 className="font-display text-[36px] font-normal leading-none tracking-[-0.02em] text-black md:text-[56px]">
              The Style Feed
            </h2>

            <div className="mt-5 h-px w-20 bg-black/20" />
          </div>
        </div>

        {/* Feed */}
        <div className="grid justify-center gap-5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] md:gap-6">
          {posts.map((post) => {
            

            const focalX =
              typeof post.imageFocalX === "number" ? post.imageFocalX : 50;

            const focalY =
              typeof post.imageFocalY === "number" ? post.imageFocalY : 50;

            return (
              <button
                key={post.id}
                type="button"
                onClick={() => setSelectedPost(post)}
                className="group block w-full text-left"
>
                <article>
                  <div className="relative aspect-[4/5] overflow-hidden bg-black/5">
                    <Image
                      src={post.imageUrl}
                      alt={
                        post.imageAlt ||
                        (post.brandName
                          ? `${post.brandName} style post`
                          : "Style post")
                      }
                      fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                      style={{
                        objectPosition: `${focalX}% ${focalY}%`,
                      }}
                    />

                    {/* Desktop hover overlay */}
                    <div className="absolute inset-0 hidden bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 md:block" />

                    <div className="absolute inset-x-0 bottom-0 hidden translate-y-4 p-6 text-white opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100 md:block">
                      {post.brandName ? (
                        <h3 className="font-display text-[28px] font-normal leading-none">
                          {post.brandName}
                        </h3>
                      ) : null}

                      {post.caption ? (
                        <p className="mt-3 line-clamp-3 font-body text-[13px] leading-5 text-white/85">
                          {post.caption}
                        </p>
                      ) : null}

                      <div className="mt-5 flex items-center gap-4 font-body text-[10px] uppercase tracking-[0.2em] text-white/90">
                        <span className="border-b border-white/50 pb-1">
                          Shop the look
                        </span>

                        <span className="text-base transition-transform duration-300 group-hover:translate-x-1">
                          →
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile details */}
                  <div className="pt-4 md:hidden">
                    {post.brandName ? (
                      <h3 className="font-display text-[24px] font-normal leading-none text-black">
                        {post.brandName}
                      </h3>
                    ) : null}

                    {post.caption ? (
                      <p className="mt-2 line-clamp-2 font-body text-[14px] leading-6 text-black/65">
                        {post.caption}
                      </p>
                    ) : null}

                    <div className="mt-4 flex items-center gap-3">
                      <span className="font-body text-[10px] uppercase tracking-[0.18em] text-black/50">
                        Shop the look
                      </span>

                      <span className="text-black/40">→</span>
                    </div>
                  </div>
                </article>
              </button>
            );
          })}
        </div>

        {selectedPost ? (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-[2px]"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) {
        setSelectedPost(null);
      }
    }}
  >
    <div className="relative max-h-[90vh] w-full max-w-[720px] overflow-y-auto bg-white shadow-2xl">
      <button
        type="button"
        onClick={() => setSelectedPost(null)}
        aria-label="Close Shop the Look"
        className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-xl text-black shadow-sm transition hover:bg-white"
      >
        ×
      </button>

      <div className="relative aspect-[4/5] w-full overflow-hidden bg-black/5">
        <Image
          src={selectedPost.imageUrl}
          alt={selectedPost.imageAlt || "Style inspiration"}
          fill
          className="object-cover"
          style={{
            objectPosition: `${
              typeof selectedPost.imageFocalX === "number"
                ? selectedPost.imageFocalX
                : 50
            }% ${
              typeof selectedPost.imageFocalY === "number"
                ? selectedPost.imageFocalY
                : 50
            }%`,
          }}
          sizes="(max-width: 768px) 100vw, 720px"
        />
      </div>

      <div className="px-5 py-6 md:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-5">
          <div>
            {selectedPost.brandInstagramHandle ? (
              <p className="text-sm font-medium text-black">
                {selectedPost.brandInstagramHandle}
              </p>
            ) : null}

            {selectedPost.caption ? (
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-black/55">
                {selectedPost.caption}
              </p>
            ) : null}
          </div>

          {selectedPost.permalink || selectedPost.brandInstagramUrl ? (
            <a
              href={
                selectedPost.permalink ||
                selectedPost.brandInstagramUrl ||
                "#"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] uppercase tracking-[0.16em] text-black/50 underline underline-offset-4 transition hover:text-black"
            >
              View original post ↗
            </a>
          ) : null}
        </div>

        <div className="pt-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-display text-[30px] font-normal leading-none text-black">
              Shop the Look
            </h3>

            <span className="text-xs text-black/40">
              {selectedPost.products?.length ?? 0} products
            </span>
          </div>

          {selectedPost.products && selectedPost.products.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4">
              {selectedPost.products.map((product) => (
                <Link
                  key={product.id}
                  href={`/b/${product.brandSlug}/p/${product.slug}`}
                  onClick={() => setSelectedPost(null)}
                  className="group/product"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-black/[0.035]">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover/product:scale-[1.025]"
                        sizes="(max-width: 640px) 50vw, 180px"
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-xs text-black/30">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="pt-3">
                    <p className="text-[9px] font-medium uppercase tracking-[0.14em] text-black/40">
                      {product.brandName}
                    </p>

                    <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-black">
                      {product.title}
                    </p>

                    {product.price ? (
                      <div className="mt-1 text-xs text-black/60">
                        <MoneyLabel
                        amount={product.price}
                        currency={product.currency}
                        />
                          </div>
                        ) : null}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-black/10 px-4 py-8 text-center text-sm text-black/45">
              No products have been added to this look yet.
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
) : null}


      </div>
    </section>
  );
}