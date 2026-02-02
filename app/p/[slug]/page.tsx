import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: {
      brand: true,
      images: true,
    },
  });

  if (!product || !product.publishedAt || !product.isActive) {
    return <div className="p-6">Product not found.</div>;
  }

  const outLink = product.affiliateUrl || product.sourceUrl;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{product.title}</h1>

      <p className="mt-1 text-sm text-zinc-600">
        Brand: {product.brand?.name}
      </p>

      {/* Example: show price */}
      {product.price && (
        <p className="mt-2 text-lg">
          {product.currency} {Number(product.price).toFixed(2)}
        </p>
      )}

      {/* ✅ Buy button */}
      <div className="mt-6">
        {outLink ? (
          <Link
            href={`/out/${product.id}`} // we will create this route
            className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm text-white"
          >
            Buy on brand site
          </Link>
        ) : (
          <button
            disabled
            className="rounded-md bg-black/30 px-4 py-2 text-sm text-white"
          >
            Link coming soon
          </button>
        )}
      </div>
    </div>
  );
}
