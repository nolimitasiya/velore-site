import Link from "next/link";

type ProductCard = {
  slug: string;
  brand: string;
  title: string;
  price: string;
  imageUrl: string;
  tags: string[];
};

const MOCK_PRODUCTS: ProductCard[] = [
  {
    slug: "sand-maxi-dress",
    brand: "Amani Studio",
    title: "Sand Maxi Dress",
    price: "£65.00",
    imageUrl: "https://picsum.photos/seed/dalra1/800/1100",
    tags: ["opaque", "loose-fit"],
  },
  {
    slug: "black-abaya",
    brand: "Noor London",
    title: "Black Abaya",
    price: "£89.00",
    imageUrl: "https://picsum.photos/seed/dalra2/800/1100",
    tags: ["abaya", "hijab-friendly"],
  },
  {
    slug: "linen-co-ord",
    brand: "Mina Maison",
    title: "Linen Co-ord Set",
    price: "£72.00",
    imageUrl: "https://picsum.photos/seed/dalra3/800/1100",
    tags: ["summer", "loose-fit"],
  },
  {
    slug: "pleated-skirt",
    brand: "Safa Collective",
    title: "Pleated Skirt",
    price: "£49.00",
    imageUrl: "https://picsum.photos/seed/dalra4/800/1100",
    tags: ["skirt", "modest"],
  },
];

export default function Home() {
  return (
    <main>
      <section className="mb-6">
        <h1 className="text-2xl font-semibold">Modest finds, curated.</h1>
        <p className="mt-2 text-gray-600">
          Veilora Club helps you discover modest-friendly pieces across brands all in one place.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {MOCK_PRODUCTS.map((p) => (
          <Link
            key={p.slug}
            href={`/p/${p.slug}`}
            className="rounded-2xl border p-3 hover:shadow-sm"
          >
            <div className="aspect-[3/4] overflow-hidden rounded-xl bg-gray-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.imageUrl}
                alt={p.title}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="mt-3">
              <div className="text-sm text-gray-600">{p.brand}</div>
              <div className="font-medium">{p.title}</div>
              <div className="mt-1 text-sm">{p.price}</div>

              <div className="mt-2 flex flex-wrap gap-2">
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </section>
    </main>
  );
}
