import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SalePage() {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      publishedAt: { not: null },
      badges: { has: "sale" },
    },
    orderBy: { updatedAt: "desc" },
    include: { brand: true, images: true },
    take: 120,
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">Sale</h1>
      <p className="mt-1 text-sm text-zinc-600">Discounted pieces across Veilora Club.</p>

      {/* render your existing product grid component here */}
      {/* <ProductGrid products={products} /> */}
      <pre className="mt-6 text-xs">{JSON.stringify(products.slice(0, 2), null, 2)}</pre>
    </div>
  );
}
