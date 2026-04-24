import SiteShell from "@/components/SiteShell";

export default function ShippingReturnsPage() {
  return (
    <SiteShell>
      <section className="mx-auto w-full max-w-[1800px] px-8 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.18em] text-black/50">
            Shipping &amp; Returns
          </p>

          <h1 className="font-heading text-2xl leading-tight md:text-5xl">
            Delivered by our brand partners.
          </h1>

          <p className="mt-6 mx-auto max-w-2xl text-base leading-8 text-black/70 md:text-lg">
            Veilora Club operates as a curated fashion discovery platform. We
            connect you with brands from around the world, while all orders are
            fulfilled directly by the retailer.
          </p>
        </div>

        <div className="mt-16 mx-auto max-w-5xl space-y-10 text-black/70 leading-8">
          <div>
            <h2 className="font-heading text-xl text-black">
              How it works
            </h2>
            <p className="mt-4">
              When you select a product on Veilora Club, you are redirected to
              the retailer’s website to complete your purchase. This means that
              the retailer is responsible for processing your order, payment,
              and delivery.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-xl text-black">
              Shipping information
            </h2>
            <p className="mt-4">
              Shipping rates, delivery times, and available regions are set by
              each individual retailer. International orders may also be subject
              to customs duties or import taxes, depending on your location.
            </p>
            <p className="mt-4">
              We recommend reviewing the retailer’s shipping details carefully
              before placing an order.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-xl text-black">
              Returns and refunds
            </h2>
            <p className="mt-4">
              Return policies, refund processes, and exchange options are
              determined by the retailer you purchase from. Veilora Club does
              not process returns or issue refunds directly.
            </p>
            <p className="mt-4">
              For any return or refund requests, please contact the retailer
              directly using the information provided on their website.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-xl text-black">
              Need help?
            </h2>
            <p className="mt-4">
              While we do not handle orders directly, we are always happy to
              assist with general guidance and help point you in the right
              direction if needed.
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