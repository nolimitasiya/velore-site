import SiteShell from "@/components/SiteShell";

export default function CookiePolicyPage() {
  return (
    <SiteShell>
      <section className="mx-auto w-full max-w-[1800px] px-8 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.18em] text-black/50">
            Cookie Policy
          </p>

          <h1 className="font-heading text-2xl leading-tight md:text-5xl">
            How we use cookies on Veilora Club.
          </h1>

          <p className="mt-6 mx-auto max-w-2xl text-base leading-8 text-black/70 md:text-lg">
            This Cookie Policy explains how Veilora Club uses cookies and
            similar technologies when you visit our platform.
          </p>
        </div>

        <div className="mt-16 mx-auto max-w-5xl space-y-10 text-black/70 leading-8">
          <div>
            <h2 className="font-heading text-xl text-black">What are cookies?</h2>
            <p className="mt-4">
              Cookies are small text files stored on your device when you visit
              a website. They help websites function properly, remember certain
              preferences, and provide information about how visitors interact
              with the platform.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-xl text-black">
              How we use cookies
            </h2>
            <p className="mt-4">
              Veilora Club uses essential cookies to support core website
              functionality and ensure the platform works as expected.
            </p>
            <p className="mt-4">
              With your consent, we may also use cookies and similar
              technologies to understand browsing behaviour, improve the
              platform, and measure product interest and performance.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-xl text-black">
              Types of cookies we may use
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-6">
              <li>
                <span className="text-black">Essential cookies:</span> required
                for the website to function properly.
              </li>
              <li>
                <span className="text-black">Analytics cookies:</span> help us
                understand how visitors use Veilora Club so we can improve the
                experience.
              </li>
              <li>
                <span className="text-black">Performance-related cookies:</span>{" "}
                may help us understand product interest, click-through activity,
                and general platform performance.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-heading text-xl text-black">
              Third-party websites
            </h2>
            <p className="mt-4">
              Veilora Club may link to third-party retailer websites. Those
              websites may use their own cookies and tracking technologies, which
              are governed by their own privacy and cookie policies.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-xl text-black">
              Managing your preferences
            </h2>
            <p className="mt-4">
              You can choose whether to accept optional cookies through our
              cookie banner. You may also manage or remove cookies through your
              browser settings at any time.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-xl text-black">
              Updates to this policy
            </h2>
            <p className="mt-4">
              We may update this Cookie Policy from time to time to reflect
              changes to our platform or legal requirements. Any updates will be
              published on this page.
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