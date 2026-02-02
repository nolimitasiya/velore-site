import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NextDayPage() {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      publishedAt: { not: null },
      badges: { has: "next_day" },
    },
    orderBy: { updatedAt: "desc" },
    include: { brand: true, images: true },
    take: 120,
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Next day delivery</h1>
      <p className="mt-1 text-sm text-zinc-600">Fast delivery items.</p>

      {/* <ProductGrid products={products} /> */}
      <pre className="mt-6 text-xs">{JSON.stringify(products.slice(0, 2), null, 2)}</pre>
    </div>
  );
}
