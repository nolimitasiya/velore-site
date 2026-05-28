import Link from "next/link";
import SiteShell from "@/components/SiteShell";

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-heading text-xl text-black">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

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
            This Privacy Policy explains how Veilora Club collects, stores, uses
            and shares personal data when you use our Website.
          </p>

          <p className="mt-4 text-sm text-black/50">
            Policy version: 21 April 2026
          </p>
        </div>

        <div className="mt-16 mx-auto max-w-5xl space-y-10 text-black/70 leading-8">
          <PolicySection title="1 INTRODUCTION">
            <p>
              This Privacy Policy is provided by Veilora Club Ltd being a
              company incorporated in England and Wales with Company Number
              17140086 and registered office address 128 City Road, London,
              United Kingdom, EC1V 2NX (‘we’, ‘our’ or ‘us’) for use of our
              website www.veiloraclub.com (Website).
            </p>
            <p>
              We take your privacy very seriously. Please read this privacy
              policy carefully as it contains important information on how and
              why we collect, store, use and share any information relating to
              you (your personal data).
            </p>
            <p>
              It also explains your rights in relation to your personal data and
              how to contact us or the relevant regulator in the event you have a
              complaint. Our collection, storage, use and sharing of your
              personal data is regulated by law, including under the UK General
              Data Protection Regulation (UK GDPR).
            </p>
            <p>
              We are the controller of personal data obtained via the Website,
              meaning we are the organisation legally responsible for deciding
              how and for what purposes it is used.
            </p>
          </PolicySection>

          <PolicySection title="2 WHAT THIS POLICY APPLIES TO">
            <p>This privacy policy relates to your use of the Website only.</p>
            <p>
              The Website may link to or rely on other apps, websites, APIs or
              services owned and operated by us or by certain trusted third
              parties to enable us to provide you with Website. These other apps,
              websites, APIs or services may also gather information about you in
              accordance with their own separate privacy policies.
            </p>
          </PolicySection>

          <PolicySection title="3 PERSONAL DATA WE COLLECT ABOUT YOU">
            <p>
              The personal data we collect about you depends on the particular
              activities carried out through the Website. We will collect and use
              the following personal data about you:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border border-black/10 text-sm">
                <thead className="bg-black/5 text-left">
                  <tr>
                    <th className="p-3">Category of data</th>
                    <th className="p-3">In more detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr>
                    <td className="p-3">
                      Identity and account data when you create an account on
                      our Website
                    </td>
                    <td className="p-3">
                      Your name, phone number and email address. Your account
                      details, such as username and password.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3">Data collected from shoppers</td>
                    <td className="p-3">
                      If you share it with us, your location country.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3">
                      Data the Website collects automatically when you use it
                    </td>
                    <td className="p-3">
                      Your activities on, and use of, the Website which reveal
                      your preferences, interests or manner of use of the Website
                      and the times of use. Time zone settings.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3">
                      Data collected when you make an enquiry with us
                    </td>
                    <td className="p-3">Your name and email address.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              If you do not provide personal data we ask for where it is
              required it may prevent us from providing the Website to you.
            </p>
            <p>
              We collect and use this personal data for the purposes described
              in the section ‘How and why we use your personal data’ below.
            </p>
          </PolicySection>

          <PolicySection title="4 SENSITIVE DATA">
            <p>
              Sensitive personal data means information related to personal data
              revealing racial or ethnic origin; political opinions; religious or
              philosophical beliefs; trade union membership; genetic data;
              biometric data; data concerning health; data concerning a person’s
              sex life; and data concerning a person’s sexual orientation.
            </p>
            <p>
              Please note that we do not knowingly or intentionally collect
              sensitive personal data or information about criminal convictions
              from individuals and that you should not submit sensitive data to
              us.
            </p>
            <p>
              If, however you do submit sensitive data to us, such as if you make
              this sensitive data available to other users of the Website, we
              will assume that you have purposefully made any such sensitive data
              manifestly public.
            </p>
          </PolicySection>

          <PolicySection title="5 HOW YOUR PERSONAL DATA IS COLLECTED">
            <p>
              We collect personal data from you directly when you place an order
              or purchase products on our Website, contact us directly or reach
              out to us via social media, make submissions via the Website when a
              forum element is available, or indirectly, such as your activity
              while using our Website.
            </p>
            <p>
              We also use cookies on our Website which may collect personal
              information about you. Detailed information regarding our use of
              cookies and similar technologies is available in our cookies
              policy.
            </p>
          </PolicySection>

          <PolicySection title="6 HOW AND WHY WE USE YOUR PERSONAL DATA">
            <p>Under data protection law, we can only use your personal data if we have a proper reason, e.g.:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>where you have given consent;</li>
              <li>to comply with our legal and regulatory obligations;</li>
              <li>
                for the performance of a contract with you or to take steps at
                your request before entering into a contract; or
              </li>
              <li>for our legitimate interests or those of a third party.</li>
            </ul>
            <p>
              A legitimate interest is when we have a business or commercial
              reason to use your information, so long as this is not overridden
              by your own rights and interests.
            </p>
          </PolicySection>

          <PolicySection title="7 MARKETING">
            <p>
              We intend to send you email marketing to inform you of our services
              such as promotions.
            </p>
            <p>
              We will always ask you for your consent before sending you
              marketing communications, except where you have explicitly opted-in
              to receiving email marketing from us in the past or where you were
              given the option to opt out when you initially signed up for your
              account with us and you did not do so.
            </p>
            <p>You can opt out at any time by:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>contacting us at marketing@veiloraclub.com</li>
              <li>
                using the ‘unsubscribe’ link included in all marketing emails
                you may receive from us
              </li>
            </ul>
            <p>
              We will always treat your personal data with the utmost respect and
              never sell or share it with other organisations for marketing
              purposes.
            </p>
          </PolicySection>

          <PolicySection title="8 WHO WE SHARE YOUR PERSONAL DATA WITH">
            <p>
              We routinely share personal data with service providers we use to
              help us run our business or provide the services or functionalities
              in the Website, including developers and cloud storage providers.
            </p>
            <p>
              We only allow service providers to handle your personal data if we
              are satisfied they take appropriate measures to protect your
              personal data.
            </p>
            <ul className="list-disc space-y-2 pl-6">
              <li>external auditors;</li>
              <li>professional advisors, such as lawyers and other advisors;</li>
              <li>
                law enforcement agencies, courts or tribunals and regulatory
                bodies;
              </li>
              <li>
                other parties in connection with a significant corporate
                transaction or restructuring.
              </li>
            </ul>
            <p>We will not share your personal data with any other third party.</p>
          </PolicySection>

          <PolicySection title="9 HOW LONG YOUR PERSONAL DATA WILL BE KEPT">
            <p>
              We will keep your personal data for as long as you have an active
              account with us and for a period of up to 6 years thereafter to
              comply with any accounting or legal obligations including in the
              event of the pursuit or defence of legal claims.
            </p>
            <p>
              Following the end of the aforementioned retention period, we will
              delete or anonymise your personal data.
            </p>
          </PolicySection>

          <PolicySection title="10 TRANSFERRING YOUR PERSONAL DATA OUT OF THE UK">
            <p>
              As part of the Website, we may be required to share your personal
              data with third parties based outside of the UK for the purpose of
              providing you with the Website.
            </p>
            <p>
              Under UK data protection laws, we can only transfer your personal
              data to a country outside the UK where appropriate protections,
              safeguards or exceptions apply under relevant data protection law.
            </p>
          </PolicySection>

          <PolicySection title="11 YOUR RIGHTS">
            <p>
              You generally have the following rights, which you can usually
              exercise free of charge:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full border border-black/10 text-sm">
                <tbody className="divide-y">
                  <tr>
                    <td className="p-3 text-black">Access</td>
                    <td className="p-3">
                      The right to be provided with a copy of your personal data.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 text-black">Correction</td>
                    <td className="p-3">
                      The right to require us to correct any mistakes in your
                      personal data.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 text-black">Erasure</td>
                    <td className="p-3">
                      The right to require us to delete your personal data in
                      certain situations.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 text-black">Restriction of use</td>
                    <td className="p-3">
                      The right to require us to restrict use of your personal
                      data in certain circumstances.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 text-black">Data portability</td>
                    <td className="p-3">
                      The right to receive the personal data you provided to us
                      in a structured, commonly used and machine-readable format.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 text-black">To object to use</td>
                    <td className="p-3">
                      The right to object to direct marketing and, in certain
                      other situations, to our continued use of your personal
                      data.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 text-black">
                      Not to be subject to decisions without human involvement
                    </td>
                    <td className="p-3">
                      The right not to be subject to a decision based solely on
                      automated processing. We do not make any such decisions
                      based on data collected by the Website.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              If you would like to exercise any of those rights, please contact
              us and provide enough information to identify yourself and let us
              know which right you want to exercise.
            </p>
          </PolicySection>

          <PolicySection title="12 KEEPING YOUR PERSONAL DATA SECURE">
            <p>
              We have appropriate security measures to prevent personal data from
              being accidentally lost, or used or accessed unlawfully. We limit
              access to your personal data to those who have a genuine business
              need to access it.
            </p>
            <p>
              We also have procedures in place to deal with any suspected data
              security breach. We will notify you and any applicable regulator of
              a suspected data security breach where we are legally required to
              do so.
            </p>
          </PolicySection>

          <PolicySection title="13 HOW TO COMPLAIN">
            <p>
              Please contact us if you have any queries or concerns about our use
              of your information. We hope we will be able to resolve any issues
              you may have.
            </p>
            <p>
              You also have the right to lodge a complaint with the Information
              Commissioner. The Information Commissioner can be contacted at
              https://ico.org.uk/make-a-complaint or by telephone on 0303 123
              1113.
            </p>
          </PolicySection>

          <PolicySection title="14 CHANGES TO THIS PRIVACY POLICY">
            <p>
              We may change this privacy policy from time to time. When we make
              significant changes we will take steps to inform you, for example
              via the Website or by other means, such as email.
            </p>
          </PolicySection>

          <PolicySection title="15 HOW TO CONTACT US">
            <p>
              You can contact us if you have any questions about this privacy
              policy or the information we hold about you, to exercise a right
              under data protection law or to make a complaint.
            </p>
            <p>Our contact details are shown below:</p>
            <p>
  <Link href="/contact" className="text-black underline underline-offset-4">
    https://www.veiloraclub.com/contact
  </Link>
</p>
            <p>Hello@veiloraclub.com</p>
          </PolicySection>
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