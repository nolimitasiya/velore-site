import SiteShell from "@/components/SiteShell";

export default function PrivacyPolicyPage() {
  return (
    <SiteShell>
      <section className="mx-auto w-full max-w-[1800px] px-8 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.18em] text-black/50">
            Privacy Policy
          </p>

          <h1 className="font-heading text-2xl leading-tight md:text-5xl">
            Your privacy, respected and protected.
          </h1>

          <p className="mt-6 mx-auto max-w-2xl text-base leading-8 text-black/70 md:text-lg">
            At Veilora Club, we are committed to protecting your personal data
            and respecting your privacy. This policy outlines how we collect,
            use, and safeguard information when you interact with our platform.
          </p>
        </div>

        <div className="mt-16 mx-auto max-w-5xl space-y-10 text-black/70 leading-8">
          <div>
            <h2 className="font-heading text-xl text-black">Who we are</h2>
            <p className="mt-4">
              Veilora Club is a curated fashion discovery platform showcasing
              products from third-party brands. We do not sell products directly
              or process payments. Any purchases are completed through the
              respective brand’s website.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-xl text-black">
              Information we collect
            </h2>
            <p className="mt-4">
              We only collect personal data that you choose to provide. This may
              include:
            </p>
            <ul className="mt-4 list-disc pl-6 space-y-2">
              <li>Your email address for enquiries or communication</li>
              <li>Information submitted through forms on our platform</li>
            </ul>
          </div>

          <div>
            <h2 className="font-heading text-xl text-black">
              How we use your information
            </h2>
            <p className="mt-4">
              We use your information solely to:
            </p>
            <ul className="mt-4 list-disc pl-6 space-y-2">
              <li>Respond to enquiries or messages you send us</li>
              <li>Provide information you have requested</li>
              <li>Improve and personalise your experience on our platform</li>
              <li>Understand how users interact with Veilora Club, including browsing and shopping behaviour, to enhance our services</li>
            </ul>
            <p className="mt-4">
              We may share aggregated and anonymised insights with our brand partners, such as product performance or click-through data. This information does not identify individual users.

We do not sell, rent, or share your personal data with third parties for marketing purposes.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-xl text-black">
              Data storage and security
            </h2>
            <p className="mt-4">
              We take appropriate technical and organisational measures to
              protect your personal data and limit access to authorised parties
              only. Data is retained only for as long as necessary to fulfil its
              intended purpose.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-xl text-black">Your rights</h2>
            <p className="mt-4">
              Under applicable data protection laws, you have the right to
              request access to, correction of, or deletion of your personal
              data. You may also withdraw your consent at any time.
            </p>
            <p className="mt-4">
              To exercise these rights, please contact us using the details
              provided on our website.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-xl text-black">Cookies</h2>
            <p className="mt-4">
              Veilora Club uses essential cookies to ensure the website functions
              correctly. We may introduce optional cookies in the future to
              enhance performance and improve user experience.
            </p>
          </div>

          <div>
            <h2 className="font-heading text-xl text-black">
              Updates to this policy
            </h2>
            <p className="mt-4">
              We may update this Privacy Policy from time to time. Any changes
              will be reflected on this page.
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