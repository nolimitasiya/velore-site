// lib/resend/templates/marketing/waitlistWelcome.ts

import { veiloraEmailTemplate } from "../base/veiloraBase";

export function waitlistWelcomeEmail(params: { name: string }) {
  const subject = "Welcome to Veilora Club ✨";

  const html = veiloraEmailTemplate({
    preheader: "A curated space connecting you to Muslim-owned fashion brands.",
    heading: "Welcome to Veilora Club",
    intro: `Salam ${params.name},`,
    bodyHtml: `
  <div style="text-align:center; max-width:520px; margin:0 auto;">

      <p>
        Thank you for joining the <strong>Veilora Club</strong> waitlist, we’re so happy to have you here 💖.
      </p>

      <p>
        Veilora Club is a  platform bringing together <strong>Muslim-owned and Muslim-friendly  brands</strong> in one place.
        Our goal is to make discovering modest, thoughtful fashion easier without compromising on values, quality or style.
      </p>

      <p>
        Instead of searching across countless websites, Veilora Club connects you directly to brands that align with modest fashion,
        ethical practices, and intentional design.
      </p>

      <p>
        You’re joining us early, which means you’ll be the first to hear when we open early access,
        launch new collections, and introduce exciting brands.
      </p>

      <p>
        We can’t wait to show you what we’re building.
      </p>

     <p style="margin-top:24px;">
  With love,
</p>

<p style="margin:4px 0 0 0; font-family:'Abril Fatface', Georgia, 'Times New Roman', serif; font-size:16px;">
  Asiya <span style="font-family:inherit;">🤍</span>
</p>
  </div>

`,
    footerNote:
      "You’re receiving this email because you signed up to the Veilora Club waitlist. If this wasn’t you, you can safely ignore this email.",
  });

  return { subject, html };
}
