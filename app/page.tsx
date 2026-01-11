import { demo } from "../data/demo";
import { Hero } from "@/components/Hero";
import { SaleTicker } from "@/components/SaleTicker";
import { SectionTitle } from "@/components/SectionTitle";
import { ProductRow } from "@/components/ProductRow";
import { SloganAndContinents } from "@/components/SloganAndContinents";
import { StyleFeed } from "@/components/StyleFeed";
import { DalrasDiary } from "@/components/DalrasDiary";
import { BrandMosaic } from "@/components/BrandMosaic";

export default function HomePage() {
  return (
    <main className="min-h-screen w-full bg-[#eee]">
      <Hero imageUrl={demo.heroImage} />
      <SaleTicker />

      <SectionTitle>SHOP TRENDY</SectionTitle>
      <ProductRow products={demo.trendy} />

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
