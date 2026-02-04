import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ProductPage({
  params,
}: {
  params: { brandSlug: string; productSlug: string };
}) {
  const product = await prisma.product.findFirst({
    where: {
      slug: params.productSlug,
      brand: { slug: params.brandSlug },
      isActive: true,
      publishedAt: { not: null },
    },
    include: {
      brand: true,
      images: true,
    },
  });

  if (!product) notFound();

  const outLink = product.affiliateUrl || product.sourceUrl;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{product.title}</h1>

      <p className="mt-1 text-sm text-zinc-600">Brand: {product.brand?.name}</p>

      {product.price && (
        <p className="mt-2 text-lg">
          {product.currency} {Number(product.price).toFixed(2)}
        </p>
      )}

      <div className="mt-6">
        {outLink ? (
          <Link
            href={`/out/${product.id}`}
            className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm text-white"
          >
            Buy on brand site
          </Link>
        ) : (
          <button disabled className="rounded-md bg-black/30 px-4 py-2 text-sm text-white">
            Link coming soon
          </button>
        )}
      </div>
    </div>
  );
}
