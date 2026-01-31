import { FROM_MARKETING, REPLY_TO_MARKETING } from "../../client";
import { sendEmail } from "../../send";

export async function sendNewsletterUnsubscribedEmail(opts: { to: string }) {
  const subject = "You’ve been unsubscribed";

  const html = `
  <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">
    <h2 style="margin:0 0 12px;">You’re unsubscribed 💔</h2>
    <p style="margin:0 0 16px;">
      You’ve been removed from Veilora Club emails. We’re sorry to see you go.
    </p>
    <p style="margin:0; color:#666; font-size:12px;">
      If this was a mistake, you can re-subscribe anytime on our website.
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
