// emails/brand-application-received.ts
import { veiloraEmailTemplate } from "../base/veiloraBase";


function capitalizeFirstName(name: string) {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function brandApplicationReceivedEmail(params: { firstName: string }) {
  const firstName = capitalizeFirstName(params.firstName);

  const subject = "We received your application ✨";

  const html = veiloraEmailTemplate({
    preheader: "Thanks for applying — our team is reviewing your submission.",
    heading: "Application received",
    intro: `Hi ${firstName},`,
    bodyHtml: `
      <p style="margin:0 0 12px 0;">
        Thanks for applying to join <strong>Veilora Club</strong>. We’ve received your details and our team will review your application shortly.
      </p>
      <p style="margin:0 0 12px 0;">
        If we need anything else, we’ll reach out by email.
      </p>
      <p style="margin:0; color:#6b6b6b; font-size:13px;">
        If you’d like to add anything, just reply to this email.
      </p>
    `,
  });

  return { subject, html };
}
