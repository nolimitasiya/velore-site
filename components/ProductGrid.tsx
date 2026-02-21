import Image from "next/image";
import MoneyLabel from "@/components/MoneyLabel";

export type GridProduct = {
  id: string;
  title: string;
  imageUrl: string | null;
  brandName?: string | null;

  price: string | null;
  currency: string;

  // keep optional for backwards compatibility, but we won't rely on it anymore
  priceLabel?: string | null;

  buyUrl: string | null;
  badges?: string[];
};

function BadgePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-white/90 border border-black/10 px-2 py-1 text-[10px] font-semibold tracking-wider">
      {children}
    </span>
  );
}

export function ProductGrid({ products }: { products: GridProduct[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => {
        const href = p.buyUrl?.trim() || null;

        return (
          <div
            key={p.id}
            className="rounded-3xl border border-black/10 bg-white overflow-hidden"
          >
            <div className="relative aspect-[3/4] bg-black/5">
              {p.imageUrl ? (
                href ? (
                  <a href={href} target="_blank" rel="noreferrer">
                    <Image
                      src={p.imageUrl}
                      alt={p.title}
                      fill
                      className="object-cover transition-transform duration-300 hover:scale-105"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  </a>
                ) : (
                  <Image
                    src={p.imageUrl}
                    alt={p.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                )
              ) : (
                <div className="absolute inset-0 grid place-items-center text-xs text-black/40">
                  No image
                </div>
              )}

              {!!p.badges?.length && (
                <div className="absolute left-3 top-3 flex flex-col gap-2">
                  {p.badges.includes("sale") && <BadgePill>SALE</BadgePill>}
                  {p.badges.includes("next_day") && <BadgePill>NEXT DAY</BadgePill>}
                </div>
              )}
            </div>

            <div className="p-4">
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium line-clamp-2 hover:underline"
                >
                  {p.title}
                </a>
              ) : (
                <div className="text-sm font-medium line-clamp-2">{p.title}</div>
              )}

              {p.brandName ? (
                <div className="mt-1 text-xs text-black/60 uppercase tracking-wide">
                  {p.brandName}
                </div>
              ) : null}

              <div className="mt-2 text-sm text-black/70">
                <MoneyLabel amount={p.price} currency={p.currency} />
              </div>

              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center rounded-full bg-black px-4 py-2 text-xs font-medium text-white hover:opacity-90"
                >
                  Shop
                </a>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
