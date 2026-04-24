import Image from "next/image";
import MoneyLabel from "@/components/MoneyLabel";

export type GridProduct = {
  id: string;
  title: string;
  imageUrl: string | null;
  brandName?: string | null;
  price: string | null;
  currency: string;
  priceLabel?: string | null;
  buyUrl: string | null;
  badges?: string[];

  analytics?: {
    sourcePage?: "HOME" | "SEARCH" | "BRAND";
    sectionId?: string | null;
    sectionKey?: string | null;
    position?: number | null;
    pageNumber?: number | null;
    isExpandedPageOne?: boolean | null;
    contextType?: string | null;
  };
};

function BadgePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-white/90 border border-black/10 px-2 py-1 text-[10px] font-semibold tracking-wider">
      {children}
    </span>
  );
}

function buildTrackedUrl(product: GridProduct, fallbackIndex: number) {
  const params = new URLSearchParams();

  const sourcePage = product.analytics?.sourcePage ?? "SEARCH";
  const sectionId = product.analytics?.sectionId ?? null;
  const sectionKey = product.analytics?.sectionKey ?? "grid";
  const position = product.analytics?.position ?? fallbackIndex + 1;
  const pageNumber = product.analytics?.pageNumber ?? 1;
  const isExpandedPageOne = product.analytics?.isExpandedPageOne ?? false;
  const contextType = product.analytics?.contextType ?? "GRID";

  params.set("src", sourcePage);
  params.set("skey", sectionKey);
  params.set("pos", String(position));
  params.set("page", String(pageNumber));
  params.set("expanded", isExpandedPageOne ? "1" : "0");
  params.set("ctx", contextType);

  if (sectionId) {
    params.set("sid", sectionId);
  }

  return `/out/${product.id}?${params.toString()}`;
}

export function ProductGrid({ products }: { products: GridProduct[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4">

      {products.map((p, index) => {
        const href = buildTrackedUrl(p, index);

        return (
          <div
            key={p.id}
            className="overflow-hidden rounded-3xl border border-black/5 bg-white transition hover:shadow-sm"
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

              {p.badges?.includes("sale") ? (
  <div className="absolute left-3 top-3 flex flex-col gap-2">
    <BadgePill>SALE</BadgePill>
  </div>
) : null}
            </div>

            <div className="p-4">
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="line-clamp-2 text-sm font-medium leading-5 hover:underline"
                >
                  {p.title}
                </a>
              ) : (
                <div className="line-clamp-2 text-sm font-medium leading-5">{p.title}</div>
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
