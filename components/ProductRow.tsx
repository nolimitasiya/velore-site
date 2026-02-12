import Image from "next/image";
import type { Currency } from "@prisma/client";

export type StorefrontProduct = {
  id: string;
  title: string;
  imageUrl: string | null;
  price: string | null;     // keep string in UI layer
  currency: Currency;       // use Prisma enum directly
  buyUrl: string | null;    // ✅ NEW (affiliateUrl preferred, else sourceUrl)
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
          {products.map((p) => {
            const href = p.buyUrl?.trim() || null;

            return (
              <div key={p.id} className="space-y-2">
                <div className="relative aspect-[3/4] overflow-hidden bg-black/5">
                  {p.imageUrl ? (
                    href ? (
                      <a href={href} target="_blank" rel="noreferrer">
                        <Image
                          src={p.imageUrl}
                          alt={p.title}
                          fill
                          className="object-cover transition-transform duration-300 hover:scale-105"
                        />
                      </a>
                    ) : (
                      <Image
                        src={p.imageUrl}
                        alt={p.title}
                        fill
                        className="object-cover transition-transform duration-300 hover:scale-105"
                      />
                    )
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-black/40">
                      No image
                    </div>
                  )}
                </div>

                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-black/80 line-clamp-2 hover:underline"
                  >
                    {p.title}
                  </a>
                ) : (
                  <div className="text-xs text-black/80 line-clamp-2">{p.title}</div>
                )}

                <div className="text-xs font-medium text-black">
                  {formatPrice(p.price, p.currency)}
                </div>

                {/* ✅ BUY BUTTON */}
                {href && (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-lg bg-black px-3 py-2 text-xs text-white hover:opacity-90"
                  >
                    Shop 
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
