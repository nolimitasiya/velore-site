import { FROM_MARKETING, REPLY_TO_MARKETING } from "../../client";
import { sendEmail } from "../../send";

export async function sendNewsletterWelcomeEmail(opts: {
  to: string;
  unsubToken: string;
}) {
  const subject = "Welcome — you’re in 💌";
const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.veiloraclub.com";
const unsubscribeUrl =
  `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(opts.unsubToken)}`;


  const html = `
  <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">
    <h2 style="margin:0 0 12px;">Welcome to Veilora Club 💌</h2>
    <p style="margin:0 0 12px;">
      Early access to drops, modest styling picks, and brand spotlights.
    </p>
    <p style="margin-top:24px;font-size:12px;color:#666">
      <a href="${unsubscribeUrl}">Unsubscribe</a>
    </p>
  </div>`;

  return sendEmail({
    from: FROM_MARKETING,
    to: opts.to,
    subject,
    html,
    replyTo: REPLY_TO_MARKETING,
  });
}
