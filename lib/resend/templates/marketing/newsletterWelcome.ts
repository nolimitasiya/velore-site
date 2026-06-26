import { FROM_MARKETING, REPLY_TO_MARKETING } from "../../client";
import { sendEmail } from "../../send";
import { veiloraEmailTemplate } from "../base/veiloraBase";

export async function sendNewsletterWelcomeEmail(opts: {
  to: string;
  unsubscribeToken: string;
}) {
  const subject = "Welcome to Veilora Club ✨";

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.veiloraclub.com";

  const unsubscribeUrl =
    `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(
      opts.unsubscribeToken
    )}`;

  const html = veiloraEmailTemplate({
    preheader:
      "You're officially subscribed to the Veilora Club newsletter.",

    heading: "Welcome to Veilora Club",

    bodyHtml: `
      <div style="text-align:center; max-width:520px; margin:0 auto;">

        <p>
          Thank you for subscribing to the <strong>Veilora Club</strong> newsletter.
        </p>

        <p>
          From now on, you'll receive carefully curated updates featuring
          modest fashion inspiration, emerging brands, exclusive collections,
          styling ideas and exciting announcements from across our community.
        </p>

        <p>
          We're building something special, and we're so happy to have you
          alongside us from the very beginning.
        </p>

        <p style="margin-top:24px;">
          With love,
        </p>

        <p style="margin:4px 0 0 0;
                  font-family:'Abril Fatface', Georgia, 'Times New Roman', serif;
                  font-size:16px;">
          Asiya 🤍
        </p>

      </div>
    `,

    cta: {
      label: "Explore Veilora Club",
      href: baseUrl,
    },

    footerNote: `
      You're receiving this email because you subscribed to the Veilora Club newsletter.
      <br /><br />
      <a href="${unsubscribeUrl}" style="color:#6E2233; text-decoration:none;">
        Unsubscribe
      </a>
    `,
  });

  return sendEmail({
    from: FROM_MARKETING,
    to: opts.to,
    subject,
    html,
    replyTo: REPLY_TO_MARKETING,
  });
}