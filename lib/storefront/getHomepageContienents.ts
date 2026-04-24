import { prisma } from "@/lib/prisma";

export async function getHomepageContinents() {
  return prisma.continent.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      imageUrl: true,
    },
  });
}