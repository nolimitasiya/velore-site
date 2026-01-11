import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const brand = await prisma.brand.create({
    data: {
      name: "Demo Brand",
      slug: "demo-brand",
    },
  });

  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      title: "Demo Abaya",
      slug: "demo-abaya",
      priceMin: 6500,
      sourceUrl: "https://example.com/product/demo-abaya",
    },
  });

  console.log("✅ Seeded brand:", brand.id);
  console.log("✅ Seeded product:", product.id);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
