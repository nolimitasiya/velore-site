import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.brand.upsert({
    where: { slug: "demo-brand" },
    update: {},
    create: {
      name: "Demo Brand",
      slug: "demo-brand",
      websiteUrl: "https://example.com",
    },
  });

  await prisma.product.create({
    data: {
      title: "Demo Abaya",
      slug: "demo-abaya",
      price: new Prisma.Decimal("65.00"),
      currency: "GBP",
      sourceUrl: "https://example.com/product/demo-abaya",
      brand: {
        connect: { slug: "demo-brand" },
      },
    },
  });
}


main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



  