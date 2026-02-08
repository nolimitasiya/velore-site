import { veiloraEmailTemplate } from "../base/veiloraBase";
/* emails/brand-rejected.ts */

export function brandRejectedEmail() {
  const subject = "Thank you for applying to Veilora Club";

  const html = veiloraEmailTemplate({
    preheader: "Thank you for your time — we’re unable to move forward right now.",
    heading: "Thank you for your application",
    bodyHtml: `
      <p style="margin:0 0 12px 0;">
        Thank you for taking the time to apply to <strong>Veilora Club</strong>.
      </p>

      <p style="margin:0 0 12px 0;">
        After careful review, we’re unable to move forward with your application at this time.
        This decision is based on current platform focus and capacity rather than the quality of your brand.
      </p>

      <p style="margin:0;">
        We truly appreciate your interest and wish you continued success.
      </p>
    `,
  });

  return { subject, html };
}
