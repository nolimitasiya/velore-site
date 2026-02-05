import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function getCurrentBrand() {
  const jar = await cookies();
  const brandId = jar.get("brand_id")?.value ?? null;
  if (!brandId) return null;

  return prisma.brand.findUnique({
    where: { id: brandId },
    select: { id: true, name: true, slug: true },
  });
}
