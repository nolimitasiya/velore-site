"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const products = [
  {
    id: "chocolate-dress",
    slug: "chocolate-draped-dress",
    title: "Chocolate Draped Dress",
    brand: "Noirai",
    price: "£79.00",
    image:
      "/campaign/graduation/products/chocolatee-dress.png",
  },
  {
    id: "ivory-cape",
    slug: "ivory-cape-dress",
    title: "Ivory Cape Dress",
    brand: "Jana The Label",
    price: "£125.00",
    image:
      "/campaign/graduation/products/ivory-capee.png",
  },
  {
    id: "chiffon-hijab",
    slug: "chiffon-hijab-taupe",
    title: "Chiffon Hijab - Taupe",
    brand: "Dalra",
    price: "£18.00",
    image:
      "/campaign/graduation/products/chiffonn-hijabb.png",
  },
  {
    id: "burgundy-dress",
    slug: "satin-draped-maxi-dress",
    title: "Satin Draped Maxi Dress",
    brand: "Nayvah",
    price: "£129.00",
    image:
      "/campaign/graduation/occasion/graduation/graduation-06-evening-gown.png",
  },
];

const regions = [
  {
    name: "ASIA",
    image:
      "/campaign/graduation/regions/asia.png",
  },
  {
    name: "EUROPE",
    image:
      "/campaign/graduation/regions/europe.png",
  },
  {
    name: "NORTH AMERICA",
    image:
      "/campaign/graduation/regions/north-america.png",
  },
  {
    name: "AUSTRALIA",
    image:
      "/campaign/graduation/regions/australiaa.png",
  },
  {
    name: "MIDDLE EAST",
    image:
      "/campaign/graduation/regions/middle-east.png",
  },
];

export default function GraduationCampaignHome() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [occasionOpen, setOccasionOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-black">

      {/* HEADER */}
      <header className="border-b border-black/10 bg-[#fcfbf8]">
        <div className="mx-auto w-full max-w-[1800px] px-5 md:px-8">

          {/* TOP BAR */}
          <div className="flex items-center justify-between py-3 text-[11px]">
            <span>🇬🇧 GBP⌄</span>

            <div className="flex items-center gap-5 text-black/55">
              <span>Search</span>
              <span>♡</span>
              <span>♙</span>
            </div>
          </div>

          {/* LOGO */}
          <div className="pb-3 text-center">
            <Link
              href="/campaign/graduation"
              className="font-heading text-3xl tracking-[0.03em] text-[#7B2D3E] md:text-5xl"
            >
              VEILORA CLUB
            </Link>
          </div>

          {/* DESKTOP NAV */}
          <nav className="hidden items-center justify-center gap-8 pb-4 font-display text-[17px] text-black/70 md:flex">

            <span>New In</span>
            <span>Clothing</span>
            <span>Accessories</span>

            {/* OCCASION DROPDOWN */}
            <div className="group relative">
              <button
                type="button"
                className="py-2 transition hover:text-[#7B2D3E]"
              >
                Occasion
              </button>

              {/* Invisible hover bridge */}
              <div className="absolute left-1/2 top-full h-5 w-56 -translate-x-1/2" />

              {/* Dropdown */}
              <div
                className="
                  pointer-events-none
                  absolute
                  left-1/2
                  top-full
                  z-50
                  w-52
                  -translate-x-1/2
                  translate-y-3
                  border
                  border-black/10
                  bg-white
                  p-5
                  opacity-0
                  shadow-xl
                  transition-all
                  duration-300
                  group-hover:pointer-events-auto
                  group-hover:translate-y-3
                  group-hover:opacity-100
                "
              >
                <span className="block cursor-default py-2 font-display text-[16px] transition hover:text-[#7B2D3E]">
                  Everyday
                </span>

                <span className="block cursor-default py-2 font-display text-[16px] transition hover:text-[#7B2D3E]">
                  Workwear
                </span>

                <span className="block cursor-default py-2 font-display text-[16px] transition hover:text-[#7B2D3E]">
                  Wedding
                </span>

                <Link
                  href="/campaign/graduation/occasion/graduation"
                  className="block py-2 font-display text-[16px] transition hover:text-[#7B2D3E]"
                >
                  Graduation
                </Link>

                <span className="block cursor-default py-2 font-display text-[16px] transition hover:text-[#7B2D3E]">
                  Evening
                </span>
              </div>
            </div>

            <span>Brands</span>
            <span>Editorial</span>
            <span>Sale</span>

          </nav>

          {/* MOBILE NAV */}
          <div className="pb-4 md:hidden">

            <button
              type="button"
              onClick={() =>
                setMobileMenuOpen((prev) => !prev)
              }
              className="mx-auto flex items-center gap-2 font-display text-[16px] text-black/70"
            >
              Menu

              <span className="text-xs">
                {mobileMenuOpen ? "−" : "+"}
              </span>
            </button>

            {mobileMenuOpen && (
              <div className="mt-4 border-t border-black/10 pt-4">

                <div className="flex flex-col items-center gap-4 font-display text-[17px] text-black/70">

                  <span>New In</span>
                  <span>Clothing</span>
                  <span>Accessories</span>

                  {/* MOBILE OCCASION */}
                  <div className="w-full text-center">

                    <button
                      type="button"
                      onClick={() =>
                        setOccasionOpen((prev) => !prev)
                      }
                      className="flex w-full items-center justify-center gap-2"
                    >
                      Occasion

                      <span className="text-xs">
                        {occasionOpen ? "−" : "+"}
                      </span>
                    </button>

                    {occasionOpen && (
                      <div className="mt-3 flex flex-col gap-3 bg-[#f7f4ef] py-4 text-[15px]">

                        <span className="text-black/50">
                          Everyday
                        </span>

                        <span className="text-black/50">
                          Workwear
                        </span>

                        <span className="text-black/50">
                          Wedding
                        </span>

                        <Link
                          href="/campaign/graduation/occasion/graduation"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setOccasionOpen(false);
                          }}
                          className="font-medium text-[#7B2D3E]"
                        >
                          Graduation
                        </Link>

                        <span className="text-black/50">
                          Evening
                        </span>

                      </div>
                    )}

                  </div>

                  <span>Brands</span>
                  <span>Editorial</span>
                  <span>Sale</span>

                </div>
              </div>
            )}

          </div>

        </div>
      </header>

      {/* HERO */}
      <section className="relative h-[390px] overflow-hidden md:h-[480px]">

        <Image
          src="/campaign/graduation/hero.jpg"
          alt=""
          fill
          priority
          className="object-cover"
        />

        <div className="absolute inset-0 bg-black/25" />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center text-white">

          <h1 className="max-w-2xl font-display text-4xl font-normal leading-[1.05] tracking-[-0.02em] md:text-6xl">
  Discover modest fashion
  <br />
  from around the world
</h1>

          <button
            type="button"
            className="mt-7 rounded-full bg-white px-6 py-3 text-xs font-medium text-black"
          >
            Shop Now
          </button>

        </div>

      </section>

      {/* TRENDING THIS WEEK */}
      <section className="mx-auto w-full max-w-[1200px] px-5 py-12 md:px-8 md:py-16">

        <h2 className="max-w-2xl font-display text-4xl font-normal leading-[1.05] tracking-[-0.02em] md:text-5xl">

          Trending This Week
        </h2>

        <div className="mt-4 h-px w-12 bg-black/20" />

        <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">

          {products.map((product) => (
            <article
              key={product.id}
              className="overflow-hidden rounded-[18px] border border-black/10 bg-white"
            >

              {/* CLICKABLE PRODUCT IMAGE */}
              <Link
                href={`/campaign/graduation/product/${product.slug}`}
                className="block"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-[#f5f1eb]">

                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition duration-300 hover:scale-[1.02]"
                  />

                </div>
              </Link>

              <div className="p-4">

                {/* CLICKABLE PRODUCT TITLE */}
                <Link
                  href={`/campaign/graduation/product/${product.slug}`}
                  className="block"
                >
                  <h3 className="text-sm font-medium transition hover:text-[#7B2D3E]">
                    {product.title}
                  </h3>
                </Link>

                <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-black/50">
                  {product.brand}
                </p>

                <p className="mt-2 text-sm">
                  {product.price}
                </p>

                {/* SHOP FIRST OPENS PDP */}
                <Link
                  href={`/campaign/graduation/product/${product.slug}`}
                  className="mt-3 inline-block rounded-full bg-black px-4 py-2 text-[11px] text-white transition hover:bg-[#7B2D3E]"
                >
                  Shop
                </Link>

              </div>

            </article>
          ))}

        </div>

      </section>

      {/* DISCOVER WORLD */}
      <section className="mx-auto w-full max-w-[1500px] px-5 py-8 md:px-8 md:py-14">

        <p className="text-[10px] uppercase tracking-[0.25em] text-black/40">
          Shop by region
        </p>

        <h2 className="max-w-2xl font-display text-4xl font-normal leading-[1.05] tracking-[-0.02em] md:text-5xl">
          Discover the World
        </h2>

        <div className="mt-5 h-px w-12 bg-black/20" />

        <div className="mt-8 flex gap-3 overflow-x-auto pb-3 md:grid md:grid-cols-5">

          {regions.map((region) => (
            <div
              key={region.name}
              className="relative aspect-[3/4] min-w-[65vw] overflow-hidden rounded-2xl sm:min-w-[280px] md:min-w-0"
            >

              <Image
                src={region.image}
                alt={region.name}
                fill
                sizes="(max-width: 768px) 65vw, 20vw"
                className="object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

              <div className="absolute bottom-5 left-5 text-xs font-semibold tracking-[0.18em] text-white">
                {region.name}
              </div>

            </div>
          ))}

        </div>

      </section>

    </div>
  );
}