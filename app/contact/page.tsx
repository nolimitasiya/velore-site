import SiteShell from "@/components/SiteShell";
import ContactForm from "./ContactForm";

export default function ContactPage() {
  return (
    <SiteShell>
      <section className="mx-auto w-full max-w-[1800px] px-8 py-16 md:py-24">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.18em] text-black/50">
            Contact
          </p>

          <h1 className="font-heading text-2xl leading-tight md:text-5xl">
            We’re here to help.
          </h1>

          <p className="mt-6 mx-auto max-w-2xl text-base leading-8 text-black/70 md:text-lg">
            Have a question about a product, or anything else?
            Our team is here to support you.
          </p>

          <p className="mt-8 text-base md:text-lg text-black/70 leading-7">
  Prefer email? You can reach us at{" "}
  <a
    href="mailto:hello@veiloraclub.com"
    className="text-black font-medium underline underline-offset-4"
  >
    hello@veiloraclub.com
  </a>
</p>

<p className="mt-3 text-base md:text-lg text-black/70 leading-7">
  We aim to respond within 24–48 hours.
</p>
        </div>

        {/* Form */}
        <div className="mt-16 mx-auto max-w-2xl">
          <ContactForm />
        </div>

        {/* Footer signature (optional but very on-brand) */}
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