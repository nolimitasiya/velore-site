"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const products = [
  
   {
    id: "chocolate-dress",
    title: "Chocolate Draped Dress",
    brand: "ELARA",
    price: "£118.00",
    image:
      "/campaign/graduation/products/chocolatee-dress.png",
  },
  {
    id: "ivory-cape",
    title: "Ivory Cape Dress",
    brand: "NURA",
    price: "£125.00",
    image:
      "/campaign/graduation/products/ivory-capee.png",
  },
  {
    id: "chiffon-hijab",
    title: "Chiffon Hijab - Taupe",
    brand: "SERA",
    price: "£18.00",
    image:
      "/campaign/graduation/products/chiffonn-hijabb.png",
  },
  
  {
    id: "burgundy-dress",
    title: "Satin Draped Maxi Dress",
    brand: "MAISON AYA",
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
          <div className="flex items-center justify-between py-3 text-[11px]">
            <span>🇬🇧 GBP⌄</span>

            <div className="flex items-center gap-5 text-black/55">
              <span>Search</span>
              <span>♡</span>
              <span>♙</span>
            </div>
          </div>

          <div className="pb-3 text-center">
            <Link
              href="/campaign/graduation"
              className="font-heading text-3xl tracking-[0.03em] text-[#7B2D3E] md:text-5xl"
            >
              VEILORA CLUB
            </Link>
          </div>

          <nav className="hidden items-center justify-center gap-8 pb-4 font-display text-[17px] text-black/70 md:flex">
            <span>New In</span>
<span>Clothing</span>
<span>Accessories</span>

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
    onClick={() => setMobileMenuOpen((prev) => !prev)}
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
            onClick={() => setOccasionOpen((prev) => !prev)}
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
        {/*
          IMPORTANT:
          Replace this path with the SAME image file your real homepage hero uses.

          For example:
          /images/home-hero.jpg
        */}
        <Image
          src="/campaign/graduation/hero.jpg"
          alt=""
          fill
          priority
          className="object-cover"
        />

        <div className="absolute inset-0 bg-black/25" />

        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center text-white">
          <h1 className="max-w-lg font-heading text-4xl leading-[0.95] md:text-6xl">
            Discover modest fashion from around the world
          </h1>

          <button className="mt-7 rounded-full bg-white px-6 py-3 text-xs font-medium text-black">
            Shop Now
          </button>
        </div>
      </section>

      {/* SHOP TRENDY */}
      <section className="mx-auto w-full max-w-[1200px] px-5 py-12 md:px-8 md:py-16">
        <h2 className="font-heading text-3xl md:text-4xl">
          Trending This Week
        </h2>

        <div className="mt-4 h-px w-12 bg-black/20" />

        <div className="mt-8 flex gap-4 overflow-x-auto pb-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="min-w-[72vw] overflow-hidden rounded-[18px] border border-black/10 bg-white sm:min-w-[340px] md:min-w-0 md:flex-1"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-[#f5f1eb]">
                <Image
                  src={product.image}
                  alt={product.title}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover"
                />

                <button
                  type="button"
                  aria-label={`Save ${product.title}`}
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg shadow-sm"
                >
                  ♡
                </button>
              </div>

              <div className="p-4">
                <h3 className="text-sm font-medium">
                  {product.title}
                </h3>

                <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-black/50">
                  {product.brand}
                </p>

                <p className="mt-2 text-sm">
                  {product.price}
                </p>

                <button
                  type="button"
                  className="mt-3 rounded-full bg-black px-4 py-2 text-[11px] text-white"
                >
                  Shop
                </button>
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

        <h2 className="mt-3 font-heading text-4xl md:text-5xl">
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