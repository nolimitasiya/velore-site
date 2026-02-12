import Image from "next/image";
import type { Currency } from "@prisma/client";

export type StorefrontProduct = {
  id: string;
  title: string;
  imageUrl: string | null;
  price: string | null;     // keep string in UI layer
  currency: Currency;       // use Prisma enum directly
};

function formatPrice(price: string | null, currency: Currency) {
  if (!price) return "—";

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(Number(price));
}

export function ProductRow({ products }: { products: StorefrontProduct[] }) {
  return (
    <section className="bg-[#eee]">
      <div className="mx-auto w-full max-w-[1800px] px-8 pb-12">
        <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
          {products.map((p) => (
            <div key={p.id} className="space-y-2">
              <div className="relative aspect-[3/4] overflow-hidden bg-black/5">
                {p.imageUrl ? (
                  <Image
                    src={p.imageUrl}
                    alt={p.title}
                    fill
                    className="object-cover transition-transform duration-300 hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-black/40">
                    No image
                  </div>
                )}
              </div>

              <div className="text-xs text-black/80 line-clamp-2">{p.title}</div>

              <div className="text-xs font-medium text-black">
                {formatPrice(p.price, p.currency)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
