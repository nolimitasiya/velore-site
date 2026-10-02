import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SIZES = ["54", "56", "58", "60"] as const;

async function main() {
  for (const size of SIZES) {
    const record = await prisma.size.upsert({
      where: {
        slug: size,
      },
      update: {
        name: size,
      },
      create: {
        name: size,
        slug: size,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    console.log(`✓ ${record.name} (${record.slug})`);
  }

  console.log(`✓ ${SIZES.length} length-based sizes ready`);
}

main()
  .catch((error) => {
    console.error("Failed to upsert sizes:", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });