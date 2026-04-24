import SiteShell from "@/components/SiteShell";

export default function AboutPage() {
  return (
    <SiteShell>
      <section className="mx-auto w-full max-w-[1800px] px-8 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
  <p className="mb-4 text-sm uppercase tracking-[0.18em] text-black/50">
    About Us
  </p>

  <h1 className="font-heading text-2xl leading-tight md:text-5xl">
    A refined destination for modest fashion.
  </h1>

  <p className="mt-6 mx-auto max-w-2xl text-base leading-8 text-black/70 md:text-lg">
    Veilora Club is a curated platform bringing together modest fashion brands
    from around the world in one elevated shopping experience. We exist to make
    discovery feel effortless, connecting women to pieces that reflect their
    values, style, and individuality.
  </p>
</div>

        <div className="mt-16 mx-auto max-w-5xl grid gap-12 md:grid-cols-2 md:gap-16">
  <div className="mx-auto max-w-xl">
    <h2 className="font-heading text-2xl md:text-3xl text-center md:text-left">
      Our vision
    </h2>

    <p className="mt-5 text-black/70 leading-8 text-center md:text-left">
      We believe modest fashion deserves a space of its own. One that feels
      intentional, inspiring, and beautifully curated. A space where women do
      not have to compromise between modesty, quality, and contemporary style.
    </p>

    <p className="mt-5 text-black/70 leading-8 text-center md:text-left">
      Veilora Club was created to simplify that journey. Our community can discover
      brands and collections in one destination designed around their needs.
    </p>
  </div>

  <div className="mx-auto max-w-xl">
    <h2 className="font-heading text-2xl md:text-3xl text-center md:text-left">
      What we offer
    </h2>

    <p className="mt-5 text-black/70 leading-8 text-center md:text-left">
      Our platform brings together global modest fashion brands across clothing,
      occasionwear, essentials, and everyday style. We focus on thoughtful
      curation and a shopping experience that feels both modern and relevant.
    </p>

    <p className="mt-5 text-black/70 leading-8 text-center md:text-left">
      Every brand featured on Veilora Club contributes to a broader vision:
      making modest fashion more visible, more accessible, and more beautifully
      represented on a global scale.
    </p>
  </div>
</div>

        <div className="mt-20 border-t border-black/10 pt-12 text-center">
  <div className="mx-auto max-w-3xl">
    <h2 className="font-heading text-2xl md:text-3xl">Our mission</h2>

    <p className="mt-5 text-black/70 leading-8">
      Veilora Club is designed for women who want more than just products. 
      A space where modest fashion and global style come together with intention.
    </p>

    <p className="mt-5 text-black/70 leading-8">
      Our mission is to become the leading destination for modest fashion
      worldwide, where global brands and international style meet with purpose,
      elegance, and intention.
    </p>

    <div className="mt-12">
      <p className="text-black/60 italic">With love,</p>
      <p className="mt-1 font-heading text-lg tracking-wide">
        Veilora Club Team
      </p>
    </div>
  </div>
</div>

      </section>
    </SiteShell>
  );
}