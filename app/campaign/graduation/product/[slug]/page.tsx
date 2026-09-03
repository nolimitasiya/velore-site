import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

const products = {
  // ------------------------------------------------
  // GRADUATION COLLECTION
  // ------------------------------------------------

  "satin-draped-cape-dress": {
    title: "Satin Draped Cape Dress",
    brand: "Noirai",
    price: "£139.00",
    colour: "Burgundy",
    image:
      "/campaign/graduation/occasion/graduation/graduation-01-satin-draped-cape.png",
    description:
      "An elegant floor-length satin dress designed with graceful draping and a modest silhouette, perfect for graduation celebrations and special occasions.",
  },

  "draped-evening-gown": {
    title: "Draped Evening Gown",
    brand: "LAYLAH",
    price: "£149.00",
    colour: "Plum",
    image:
      "/campaign/graduation/occasion/graduation/graduation-06-evening-gown.png",
    description:
      "A refined evening gown with elegant draping, a flowing silhouette and elevated detailing for special occasions.",
  },

  "black-pleated-wrap-dress": {
    title: "Black Pleated Wrap Dress",
    brand: "ZAHRA",
    price: "£145.00",
    colour: "Black",
    image:
      "/campaign/graduation/occasion/graduation/graduation-05-black-pleated-wrap.png",
    description:
      "A timeless black occasion dress featuring elegant pleating and a flattering wrap-inspired silhouette.",
  },

  "silk-occasion-dress": {
    title: "Silk Occasion Dress",
    brand: "Noirai",
    price: "£128.00",
    colour: "Champagne",
    image:
      "/campaign/graduation/occasion/graduation/graduation-03-silky-dress.png",
    description:
      "A fluid occasion dress with a soft satin finish, designed for an elegant and understated graduation look.",
  },

  "ivory-satin-wrap-dress": {
    title: "Ivory Satin Wrap Dress",
    brand: "Jana The Label",
    price: "£135.00",
    colour: "Ivory",
    image:
      "/campaign/graduation/occasion/graduation/graduation-02-ivory-satin-wrap.png",
    description:
      "A sophisticated ivory satin dress with soft wrap detailing and a full-length modest silhouette.",
  },

  "plum-tie-waist-dress": {
    title: "Plum Tie-Waist Dress",
    brand: "Dalra",
    price: "£119.00",
    colour: "Plum",
    image:
      "/campaign/graduation/occasion/graduation/graduation-04-plum-tie-waist.png",
    description:
      "A graceful plum maxi dress with a softly defined waist and flowing silhouette for graduation and evening occasions.",
  },

  // ------------------------------------------------
  // TRENDING THIS WEEK
  // ------------------------------------------------

  "chocolate-draped-dress": {
    title: "Chocolate Draped Dress",
    brand: "Noirai",
    price: "£118.00",
    colour: "Chocolate",
    image:
      "/campaign/graduation/products/chocolatee-dress.png",
    description:
      "A fluid chocolate maxi dress with elegant draping and a refined modest silhouette, designed for elevated dressing and special occasions.",
  },

  "ivory-cape-dress": {
    title: "Ivory Cape Dress",
    brand: "NURA",
    price: "£125.00",
    colour: "Ivory",
    image:
      "/campaign/graduation/products/ivory-capee.png",
    description:
      "An elegant ivory maxi dress with a graceful flowing silhouette and soft occasion-inspired detailing.",
  },

  "chiffon-hijab-taupe": {
    title: "Chiffon Hijab",
    brand: "SERA",
    price: "£18.00",
    colour: "Burgundy",
    image:
      "/campaign/graduation/products/chiffonn-hijabb.png",
    description:
      "A lightweight printed chiffon hijab with a soft drape and elegant finish, designed for effortless everyday and occasion styling.",
  },

  "satin-draped-maxi-dress": {
    title: "Liyana Dress",
    brand: "Nayvah",
    price: "£129.00",
    colour: "Burgundy",
    image:
      "/campaign/graduation/occasion/graduation/graduation-06-evening-gown.png",
    description:
      "A statement satin maxi dress with elegant draping and a full-length modest silhouette.",
  },
};

export default async function CampaignProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product =
    products[slug as keyof typeof products];

  if (!product) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white text-black">

      {/* HEADER */}
      <header className="border-b border-black/10 bg-[#fcfbf8]">
        <div className="mx-auto max-w-[1800px] px-5 md:px-8">

          {/* TOP BAR */}
          <div className="flex items-center justify-between py-3 text-[11px]">
            <span>🇬🇧 GBP</span>

            <div className="flex items-center gap-5 text-black/55">
              <span>Search</span>
              <span>♡</span>
              <span>♙</span>
            </div>
          </div>

          {/* LOGO */}
          <div className="pb-4 text-center">
            <Link
              href="/campaign/graduation"
              className="font-heading text-3xl tracking-[0.03em] text-[#7B2D3E] md:text-5xl"
            >
              VEILORA CLUB
            </Link>
          </div>

        </div>
      </header>

      {/* BREADCRUMB */}
      <div className="mx-auto max-w-[1450px] px-5 pt-6 md:px-8">
        <Link
          href="/campaign/graduation"
          className="text-[11px] uppercase tracking-[0.15em] text-black/45 transition hover:text-[#7B2D3E]"
        >
          ← Back to Veilora
        </Link>
      </div>

      {/* PDP */}
      <main className="mx-auto max-w-[1450px] px-5 py-8 md:px-8 md:py-14">

        <div className="grid gap-10 md:grid-cols-2 md:gap-16">

          {/* PRODUCT IMAGE */}
          <div className="relative aspect-[3/4] overflow-hidden rounded-[18px] bg-[#f3f0ec]">
            <Image
              src={product.image}
              alt={product.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>

          {/* PRODUCT DETAILS */}
          <div className="md:pt-10">

            {/* BRAND */}
            <p className="text-[11px] uppercase tracking-[0.18em] text-black/45">
              {product.brand}
            </p>

            {/* TITLE */}
            <h1 className="mt-3 font-heading text-4xl leading-tight md:text-5xl">
              {product.title}
            </h1>

            {/* PRICE */}
            <p className="mt-5 text-lg">
              {product.price}
            </p>

            {/* COLOUR */}
            <div className="mt-10 border-t border-black/10 pt-7">
              <div className="flex items-center justify-between">

                <span className="text-sm">
                  Colour
                </span>

                <span className="text-sm text-black/55">
                  {product.colour}
                </span>

              </div>
            </div>

            {/* SIZE */}
            <div className="mt-8">

              <div className="flex items-center justify-between">

                <p className="text-sm">
                  Select size
                </p>

                <span className="text-xs text-black/45">
                  Size guide
                </span>

              </div>

              <div className="mt-4 grid grid-cols-5 gap-2">

                {["XS", "S", "M", "L", "XL"].map((size) => (
                  <button
                    key={size}
                    type="button"
                    className="border border-black/15 py-3 text-xs transition hover:border-black"
                  >
                    {size}
                  </button>
                ))}

              </div>
            </div>

            {/* SHOP */}
            <Link
              href={`/campaign/graduation/out/${slug}`}
              className="mt-8 block w-full rounded-full bg-black px-8 py-4 text-center text-xs uppercase tracking-[0.16em] text-white transition hover:bg-[#7B2D3E]"
            >
              Shop
            </Link>

            {/* WISHLIST */}
            <button
              type="button"
              className="mt-3 w-full rounded-full border border-black/15 px-8 py-4 text-xs uppercase tracking-[0.16em] transition hover:border-black"
            >
              ♡ Add to wishlist
            </button>

            {/* PRODUCT DETAILS */}
            <div className="mt-10 border-t border-black/10 pt-7">

              <h2 className="text-sm uppercase tracking-[0.12em]">
                Product details
              </h2>

              <p className="mt-4 max-w-lg font-display text-[16px] leading-7 text-black/55">
                {product.description}
              </p>

            </div>

          </div>

        </div>
      </main>

    </div>
  );
}