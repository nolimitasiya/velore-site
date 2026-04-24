import SiteShell from "@/components/SiteShell";

export default function EthicsPage() {
  return (
    <SiteShell>
      <section className="mx-auto w-full max-w-[1800px] px-8 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.18em] text-black/50">
            Ethics &amp; Compliance
          </p>

          <h1 className="font-heading text-2xl leading-tight md:text-5xl">
            Our commitment to thoughtful and responsible growth.
          </h1>

          <p className="mt-6 mx-auto max-w-2xl text-base leading-8 text-black/70 md:text-lg">
            At Veilora Club, we are committed to building a platform rooted in
            integrity, respect, and thoughtful curation. As we grow, we aim to
            work with brands that reflect high standards not only in design, but
            also in the way they operate.
          </p>
        </div>

        <div className="mt-16 mx-auto max-w-5xl grid gap-12 md:grid-cols-2 md:gap-16">
          <div className="mx-auto max-w-xl">
            <h2 className="font-heading text-2xl md:text-3xl text-center md:text-left">
              Our approach
            </h2>

            <p className="mt-5 text-black/70 leading-8 text-center md:text-left">
              Veilora Club does not manufacture products directly, but we are
              intentional about the brands we choose to feature. We value
              partners who demonstrate care in craftsmanship, presentation, and
              the overall quality of their customer experience.
            </p>

            <p className="mt-5 text-black/70 leading-8 text-center md:text-left">
              We believe ethical growth begins with thoughtful decisions. As a
              result, we aim to build partnerships with brands that show respect
              for responsible business practices, transparency, and long-term
              sustainability.
            </p>
          </div>

          <div className="mx-auto max-w-xl">
            <h2 className="font-heading text-2xl md:text-3xl text-center md:text-left">
              What we stand for
            </h2>

            <p className="mt-5 text-black/70 leading-8 text-center md:text-left">
              We believe modest fashion should be represented in a way that is
              respectful, inclusive, and empowering. Our platform is built to
              celebrate style while remaining mindful of values, cultural
              sensitivity, and the communities we serve.
            </p>

            <p className="mt-5 text-black/70 leading-8 text-center md:text-left">
              As Veilora Club continues to evolve, we remain committed to
              learning, improving, and strengthening the standards that guide
              our platform and partnerships.
            </p>
          </div>
        </div>

        <div className="mt-20 border-t border-black/10 pt-12 text-center">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-heading text-2xl md:text-3xl">Our commitment</h2>

            <p className="mt-5 text-black/70 leading-8">
              We are building Veilora Club with intention not only as the
              destination for modest fashion, but as a platform shaped by care,
              trust, and responsibility.
            </p>

            <div className="mt-12">
              <p className="text-black/60 italic">With love,</p>
              <p className="mt-1 font-heading text-lg tracking-[0.08em] uppercase">
                Veilora Club
              </p>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}