import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function LegacyProductPage({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findFirst({
    where: {
      slug: params.slug,
      isActive: true,
      publishedAt: { not: null },
    },
    include: {
      brand: { select: { slug: true } },
    },
    orderBy: { updatedAt: "desc" }, // deterministic
  });

  if (!product?.brand?.slug) {
    return <div className="p-6">Product not found.</div>;
  }

  redirect(`/b/${product.brand.slug}/p/${product.slug}`);
}
