import SiteShell from "@/components/SiteShell";

export default function TermsPage() {
  return (
    <SiteShell>
      <section className="mx-auto w-full max-w-[1800px] px-8 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.18em] text-black/50">
            Terms &amp; Conditions
          </p>

          <h1 className="font-heading text-2xl leading-tight md:text-5xl">
            The terms that guide our platform.
          </h1>

          <p className="mt-6 mx-auto max-w-2xl text-base leading-8 text-black/70 md:text-lg">
            These Terms &amp; Conditions govern your use of Veilora Club. By
            accessing or using our platform, you agree to be bound by these
            terms.
          </p>
        </div>

        <div className="mt-16 mx-auto max-w-5xl space-y-10 text-black/70 leading-8">
          <div>
            <h2 className="font-heading text-xl text-black">
              Platform overview
            </h2>
            <p className="mt-4">
              Veilora Club operates as a curated fashion discovery platform. We
              showcase products from third-party brands and provide links that
              redirect users to those retailers’ websites.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-xl text-black">
              Purchases and transactions
            </h2>
            <p className="mt-4">
              Veilora Club does not sell products directly, process payments, or
              fulfil orders. Any purchase you make is completed on the
              retailer’s website and is subject to their terms, conditions, and
              policies.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-xl text-black">
              Product information
            </h2>
            <p className="mt-4">
              Product prices, availability, shipping options, and promotions are
              determined by the retailer and may change without notice. While we
              aim to present accurate information, Veilora Club is not
              responsible for inaccuracies or updates made on third-party
              websites.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-xl text-black">
              Limitation of liability
            </h2>
            <p className="mt-4">
              To the fullest extent permitted by law, Veilora Club shall not be
              liable for any loss, damage, or dispute arising from purchases
              made through external retailers or the use of third-party
              websites.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-xl text-black">
              Changes to these terms
            </h2>
            <p className="mt-4">
              We may update these Terms &amp; Conditions from time to time.
              Continued use of Veilora Club following any updates constitutes
              your acceptance of the revised terms.
            </p>
          </div>
        </div>

        <div className="mt-20 border-t border-black/10 pt-12 text-center">
          <div className="mx-auto max-w-3xl">
            <p className="text-black/60 italic">With care,</p>
            <p className="mt-1 font-heading text-lg tracking-[0.08em] uppercase">
              Veilora Club
            </p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}