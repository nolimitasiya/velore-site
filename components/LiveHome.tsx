// components/LiveHome.tsx
import { Hero } from "@/components/Hero";
import { SaleTicker } from "@/components/SaleTicker";
import { SectionTitle } from "@/components/SectionTitle";
import { ProductRow } from "@/components/ProductRow";
import { SloganAndContinents } from "@/components/SloganAndContinents";
import { StyleFeed } from "@/components/StyleFeed";
import { DalrasDiary } from "@/components/DalrasDiary";
import { BrandMosaic } from "@/components/BrandMosaic";
import { demo } from "@/data/demo"; // keep for continents/tiles for now

async function getTrendyProducts() {
  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL?.startsWith("http")
      ? process.env.NEXT_PUBLIC_SITE_URL
      : "http://localhost:3000";

  const res = await fetch(`${SITE_URL}/api/storefront/products?take=12`, {
    cache: "no-store",
  });

  const j = await res.json().catch(() => ({}));
  return j.products ?? [];
}

export default async function LiveHome() {
  const trendy = await getTrendyProducts();

  return (
    <main className="min-h-screen w-full bg-[#eee]">
      <Hero imageUrl={demo.heroImage} />
      <SaleTicker />

      <SectionTitle>SHOP TRENDY</SectionTitle>
      <ProductRow products={trendy} />


      <SloganAndContinents
        slogan="Where global brands and international style meet"
        continents={demo.continents}
      />

      <StyleFeed posts={demo.styleFeed} />
      <DalrasDiary posts={demo.diary} />
      <BrandMosaic tiles={demo.brandTiles} />
      
    </main>
  );
}
