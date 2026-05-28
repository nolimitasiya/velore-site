import SiteShell from "@/components/SiteShell";

export default function CookiePolicyPage() {
  return (
    <SiteShell>
      <section className="mx-auto w-full max-w-[1800px] px-8 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm uppercase tracking-[0.18em] text-black/50">
            Cookies Policy
          </p>

          <h1 className="font-heading text-2xl leading-tight md:text-5xl">
            How we use cookies on Veilora Club.
          </h1>

          <p className="mt-6 mx-auto max-w-2xl text-base leading-8 text-black/70 md:text-lg">
            Please read this policy carefully as it explains how we use cookies
            and similar technologies on our Website.
          </p>
        </div>

        <div className="mt-16 mx-auto max-w-5xl space-y-10 text-black/70 leading-8">
          <div>
            <p>
              Please read this cookie policy carefully as it contains important
              information on who we are and how we use cookies on our Website.
              This policy should be read together with our Privacy Policy which
              sets out who we are, how to contact us, what data is collected, and
              your rights in relation to your personal information.
            </p>
          </div>

          {/* 1 COOKIES */}
          <div>
            <h2 className="font-heading text-xl text-black">1 COOKIES</h2>
            <p className="mt-4">
              A cookie is a small text file which is placed onto your device
              (e.g. your smartphone or other electronic device) when you use our
              Website. When we use cookies on our Website, you will always be
              informed by a pop-up within the Website.
            </p>
            <p className="mt-4">
              Cookies help us to recognise you and your device and allow us to
              store some information about your preferences or past actions,
              including your location data.
            </p>
            <p className="mt-4">
              For example, we may monitor how many times you use our Website,
              which parts of the Website you go to, and location data. This
              information helps us understand how users interact with the
              Website. Some of this data will be aggregated or statistical,
              meaning we cannot identify you individually.
            </p>
            <p className="mt-4">
              For further information on cookies generally, including how to
              control and manage them, please visit
              www.aboutcookies.org or www.allaboutcookies.org.
            </p>
          </div>

          {/* 2 CONSENT */}
          <div>
            <h2 className="font-heading text-xl text-black">
              2 CONSENT TO USE COOKIES AND CHANGING SETTINGS
            </h2>
            <p className="mt-4">
              We will ask for your consent to place cookies or other similar
              technologies on your device, except where they are essential for
              us to provide you with a service that you have requested.
            </p>
            <p className="mt-4">
              You can withdraw consent or manage your preferences at any time
              using the cookie tool available on our Website. You may need to
              refresh the Website for changes to take effect.
            </p>
          </div>

          {/* 3 TABLE */}
          <div>
            <h2 className="font-heading text-xl text-black">
              3 OUR USE OF COOKIES
            </h2>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full border border-black/10 text-sm">
                <thead className="bg-black/5 text-left">
                  <tr>
                    <th className="p-3">Type</th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Purpose</th>
                    <th className="p-3">Consent</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-3">
                      Strictly Necessary Cookies
                    </td>
                    <td className="p-3">dalra_cookie_consent</td>
                    <td className="p-3">
                      Stores user cookie preferences.
                    </td>
                    <td className="p-3">
                      Essential – no consent required
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3">Analytics (Google Analytics)</td>
                    <td className="p-3">_ga</td>
                    <td className="p-3">
                      Tracks users and sessions for analytics.
                    </td>
                    <td className="p-3">
                      Consent required
                    </td>
                  </tr>

                  <tr>
                    <td className="p-3">Analytics</td>
                    <td className="p-3">_gid</td>
                    <td className="p-3">
                      Tracks users for a short period.
                    </td>
                    <td className="p-3">Consent required</td>
                  </tr>

                  <tr>
                    <td className="p-3">Analytics</td>
                    <td className="p-3">__gat</td>
                    <td className="p-3">
                      Limits request rate on high traffic sites.
                    </td>
                    <td className="p-3">Consent required</td>
                  </tr>

                  <tr>
                    <td className="p-3">Affiliate / Tracking</td>
                    <td className="p-3">
                      utm_source, utm_medium, utm_campaign
                    </td>
                    <td className="p-3">
                      Tracks traffic sources and campaigns.
                    </td>
                    <td className="p-3">Consent required</td>
                  </tr>

                  <tr>
                    <td className="p-3">Affiliate / Tracking</td>
                    <td className="p-3">vc_affiliate_id</td>
                    <td className="p-3">
                      Tracks referrals for commission attribution.
                    </td>
                    <td className="p-3">Consent required</td>
                  </tr>

                  <tr>
                    <td className="p-3">Performance</td>
                    <td className="p-3">vc_session</td>
                    <td className="p-3">
                      Maintains session state and functionality.
                    </td>
                    <td className="p-3">Consent required</td>
                  </tr>

                  <tr>
                    <td className="p-3">Third-Party</td>
                    <td className="p-3">External retailers</td>
                    <td className="p-3">
                      Third-party sites may set cookies when users click
                      affiliate links.
                    </td>
                    <td className="p-3">Consent required</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4 TURN OFF */}
          <div>
            <h2 className="font-heading text-xl text-black">
              4 HOW TO TURN OFF COOKIES
            </h2>
            <p className="mt-4">
              You can change your device settings to refuse cookies. Please note
              that doing so may affect the functionality of this Website and
              others you use.
            </p>
          </div>

          {/* 5 CHANGES */}
          <div>
            <h2 className="font-heading text-xl text-black">
              5 CHANGES TO THIS POLICY
            </h2>
            <p className="mt-4">
              This policy was published on 27/04/2026 and last updated on
              27/04/2026. We may update this policy from time to time and will
              notify you via the Website or by email where appropriate.
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