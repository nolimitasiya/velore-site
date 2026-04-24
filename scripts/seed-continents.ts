import { PrismaClient, Region } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const continents: Array<{
    slug: string;
    name: string;
    region: Region;
    imageUrl: string;
    sortOrder: number;
  }> = [
    {
      slug: "africa",
      name: "Africa",
      region: Region.AFRICA,
      imageUrl: "/home/continent-africa.jpg",
      sortOrder: 1,
    },
    {
      slug: "asia",
      name: "Asia",
      region: Region.ASIA,
      imageUrl: "/home/continent-asia.jpg",
      sortOrder: 2,
    },
    {
      slug: "south-america",
      name: "South America",
      region: Region.SOUTH_AMERICA,
      imageUrl: "/home/continent-south-america.jpg",
      sortOrder: 3,
    },
    {
      slug: "europe",
      name: "Europe",
      region: Region.EUROPE,
      imageUrl: "/home/continent-europe.jpg",
      sortOrder: 4,
    },
    {
      slug: "north-america",
      name: "North America",
      region: Region.NORTH_AMERICA,
      imageUrl: "/home/continent-north-america.jpg",
      sortOrder: 5,
    },
    {
      slug: "australia",
      name: "Australia",
      region: Region.OCEANIA,
      imageUrl: "/home/continent-australia.jpg",
      sortOrder: 6,
    },
    {
      slug: "middle-east",
      name: "Middle East",
      region: Region.MIDDLE_EAST,
      imageUrl: "/home/continent-middle-east.jpg",
      sortOrder: 7,
    },
  ];

  for (const continent of continents) {
    await prisma.continent.upsert({
      where: { slug: continent.slug },
      update: {
        name: continent.name,
        region: continent.region,
        imageUrl: continent.imageUrl,
        sortOrder: continent.sortOrder,
      },
      create: continent,
    });
  }

  console.log("✅ Continents seeded");
}

main()
  .catch((error) => {
    console.error("❌ Failed to seed continents", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

  