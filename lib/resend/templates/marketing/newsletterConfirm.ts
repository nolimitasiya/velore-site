import { FROM_MARKETING, REPLY_TO_MARKETING } from "../../client";
import { sendEmail } from "../../send";

export async function sendNewsletterConfirmEmail(opts: {
  to: string;
  confirmToken: string;
  unsubscribeToken: string;
}) {
const baseUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.veiloraclub.com";
  const confirmUrl =
  `${baseUrl}/api/newsletter/confirm?token=${encodeURIComponent(opts.confirmToken)}`;
const unsubscribeUrl =
  `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(opts.unsubscribeToken)}`;


  const subject = "Confirm your subscription 💌";

  const html = `
  <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">
    <h2 style="margin:0 0 12px;">Confirm your email 💌</h2>
    <p style="margin:0 0 16px;">
      Click below to confirm your subscription to Veilora Club newsletters.
    </p>

    <p style="margin:0 0 18px;">
      <a href="${confirmUrl}" style="display:inline-block; padding:10px 14px; border-radius:10px; text-decoration:none; background:#111; color:#fff;">
        Confirm subscription
      </a>
    </p>

    <p style="margin:0; color:#666; font-size:12px;">
      If you didn’t request this, you can ignore this email.
      <br />
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
