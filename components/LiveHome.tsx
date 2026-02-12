// components/LiveHome.tsx
import { Hero } from "@/components/Hero";
import { SaleTicker } from "@/components/SaleTicker";
import { SectionTitle } from "@/components/SectionTitle";
import { ProductRow, type StorefrontProduct } from "@/components/ProductRow";
import { SloganAndContinents } from "@/components/SloganAndContinents";
import { StyleFeed } from "@/components/StyleFeed";
import { DalrasDiary } from "@/components/DalrasDiary";
import { BrandMosaic } from "@/components/BrandMosaic";
import { prisma } from "@/lib/prisma";
import { demo } from "@/data/demo";

export default async function LiveHome() {
  const products = await prisma.product.findMany({
    where: {
      status: "APPROVED",
      isActive: true,
      publishedAt: { not: null },
    },
    orderBy: { publishedAt: "desc" },
    take: 12,
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,

      // ✅ add these
      affiliateUrl: true,
      sourceUrl: true,

      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true },
      },
    },
  });

  const trendy: StorefrontProduct[] = products.map((p) => ({
    id: p.id,
    title: p.title,
    imageUrl: p.images?.[0]?.url ?? null,
    price: p.price ? p.price.toString() : null, // Decimal -> string
    currency: p.currency, // Currency enum

    // ✅ affiliate first, fallback to source
    buyUrl: (p.affiliateUrl || p.sourceUrl || null) as string | null,
  }));

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
