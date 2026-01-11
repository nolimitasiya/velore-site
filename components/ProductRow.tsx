import Image from "next/image";
import type { DemoProduct } from "../data/demo";

export function ProductRow({ products }: { products: DemoProduct[] }) {
  return (
    <section className="bg-[#eee]">
      <div className="mx-auto w-full max-w-[1800px] px-8 pb-12">
        <div
  className="
    grid gap-6
    [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]
    justify-center
  "
>

          {products.map((p) => (
            <div key={p.id} className="space-y-2">
              <div className="relative aspect-[3/4] overflow-hidden bg-black/5">
                <Image
                  src={p.imageUrl}
                  alt={p.title}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="text-xs text-black/80">{p.title}</div>
              <div className="text-xs text-black">{p.priceLabel}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
