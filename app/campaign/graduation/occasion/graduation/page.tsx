import Image from "next/image";
import Link from "next/link";

const graduationProducts = [
  {
    id: "graduation-01",
    title: "Satin Draped Cape Dress",
    brand: "MAISON AYA",
    price: "£139.00",
    image:
      "/campaign/graduation/occasion/graduation/graduation-01-satin-draped-cape.png",
  },

  {
    id: "graduation-06",
    title: "Draped Evening Gown",
    brand: "LAYLAH",
    price: "£149.00",
    image:
      "/campaign/graduation/occasion/graduation/graduation-06-evening-gown.png",
  },

  {
    id: "graduation-05",
    title: "Black Pleated Wrap Dress",
    brand: "ZAHRA",
    price: "£145.00",
    image:
      "/campaign/graduation/occasion/graduation/graduation-05-black-pleated-wrap.png",
  },

  {
    id: "graduation-03",
    title: "Silk Occasion Dress",
    brand: "ELARA",
    price: "£128.00",
    image:
      "/campaign/graduation/occasion/graduation/graduation-03-silky-dress.png",
  },

  {
    id: "graduation-02",
    title: "Ivory Satin Wrap Dress",
    brand: "NURA",
    price: "£135.00",
    image:
      "/campaign/graduation/occasion/graduation/graduation-02-ivory-satin-wrap.png",
  },
  
  {
    id: "graduation-04",
    title: "Plum Tie-Waist Dress",
    brand: "AMARA",
    price: "£119.00",
    image:
      "/campaign/graduation/occasion/graduation/graduation-04-plum-tie-waist.png",
  },
  
  
];

export default function GraduationOccasionPage() {
  return (
    <div className="min-h-screen bg-white text-black">

      {/* HEADER */}
      <header className="border-b border-black/10 bg-[#fcfbf8]">
        <div className="mx-auto w-full max-w-[1800px] px-5 md:px-8">

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
          <div className="pb-3 text-center">
            <Link
              href="/campaign/graduation"
              className="font-heading text-3xl tracking-[0.03em] text-[#7B2D3E] md:text-5xl"
            >
              VEILORA CLUB
            </Link>
          </div>

          {/* NAV */}
          <nav className="hidden items-center justify-center gap-8 pb-4 font-display text-[17px] text-black/70 md:flex">

            <span>New In</span>
            <span>Clothing</span>
            <span>Accessories</span>

            {/* OCCASION */}
            <div className="group relative">
  <button
    type="button"
    className="py-2 transition hover:text-[#7B2D3E]"
  >
    Occasion
  </button>

  {/* Keeps hover active between Occasion and menu */}
  <div className="absolute left-1/2 top-full h-3 w-56 -translate-x-1/2" />

  <div
    className="
      invisible
      absolute
      left-1/2
      top-full
      z-[100]
      mt-3
      w-52
      -translate-x-1/2
      border
      border-black/10
      bg-white
      p-5
      opacity-0
      shadow-xl
      transition-all
      duration-200
      group-hover:visible
      group-hover:opacity-100
    "
  >
    <span className="block cursor-default py-2 font-display text-[16px] transition hover:text-[#7B2D3E]">
      Everyday
    </span>

    <span className="block cursor-default py-2 font-display text-[16px] transition hover:text-[#7B2D3E]">
      Workwear
    </span>

    <span className="block cursor-default py-2 font-display text-[16px] transition hover:text-[#7B2D3E]">
      Wedding
    </span>

    <Link
      href="/campaign/graduation/occasion/graduation"
      className="block cursor-pointer py-2 font-display text-[16px] transition hover:text-[#7B2D3E]"
    >
      Graduation
    </Link>

    <span className="block cursor-default py-2 font-display text-[16px] transition hover:text-[#7B2D3E]">
      Evening
    </span>
  </div>
</div>

            <span>Brands</span>
            <span>Editorial</span>
            <span>Sale</span>
          </nav>
        </div>
      </header>

      {/* COLLECTION INTRO */}
      <section className="mx-auto max-w-[1500px] px-5 pb-12 pt-14 text-center md:px-8 md:pb-16 md:pt-20">

        <p className="text-[10px] uppercase tracking-[0.28em] text-[#7B2D3E]">
          Occasion
        </p>

        <h1 className="mt-4 font-heading text-5xl md:text-6xl">
          Graduation
        </h1>

        <p className="mx-auto mt-5 max-w-xl font-display text-lg leading-8 text-black/55">
          Celebrate your achievement in style. Discover elegant,
          modest pieces perfect for graduation day and the memories
          that follow.
        </p>
      </section>

      {/* TOOLBAR */}
      <div className="mx-auto max-w-[1500px] px-5 md:px-8">
        <div className="flex items-center justify-between border-y border-black/10 py-4">

          <button
            type="button"
            className="text-xs uppercase tracking-[0.14em]"
          >
            Filter +
          </button>

          <span className="hidden text-[11px] uppercase tracking-[0.15em] text-black/40 md:block">
            6 Items
          </span>

          <button
            type="button"
            className="text-xs uppercase tracking-[0.14em]"
          >
            Sort By: Featured
          </button>
        </div>
      </div>

      {/* PRODUCT GRID */}
      <section className="mx-auto max-w-[1500px] px-5 py-10 md:px-8 md:py-14">

        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 md:gap-y-14">

          {graduationProducts.map((product) => (
            <article key={product.id}>

              {/* IMAGE */}
              <div className="relative aspect-[3/4] overflow-hidden rounded-[18px] bg-[#f3f0ec]">

                <Image
                  src={product.image}
                  alt={product.title}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover"
                />

                {/* HEART */}
                <button
                  type="button"
                  aria-label={`Save ${product.title}`}
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg shadow-sm"
                >
                  ♡
                </button>
              </div>

              {/* PRODUCT INFORMATION */}
              <div className="pt-4">

                <h2 className="font-display text-[17px]">
                  {product.title}
                </h2>

                <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-black/45">
                  {product.brand}
                </p>

                <p className="mt-2 text-sm">
                  {product.price}
                </p>

                <button
                  type="button"
                  className="mt-4 rounded-full bg-black px-6 py-2.5 text-[11px] text-white transition hover:bg-[#7B2D3E]"
                >
                  Shop
                </button>

              </div>
            </article>
          ))}

        </div>
      </section>

      {/* BACK */}
      <div className="pb-20 text-center">
        <Link
          href="/campaign/graduation"
          className="border-b border-black/40 pb-1 text-xs uppercase tracking-[0.16em] transition hover:text-[#7B2D3E]"
        >
          Back to Veilora
        </Link>
      </div>

    </div>
  );
}