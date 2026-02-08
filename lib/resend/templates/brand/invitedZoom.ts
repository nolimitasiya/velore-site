import { veiloraEmailTemplate } from "../base/veiloraBase";

export function brandInvitedZoomEmail(params: {
  firstName?: string;
  brandName?: string;
  schedulerUrl?: string; // Calendly/Cal.com link (optional)
}) {
  const subject = "Let’s book a quick call ✨ Veilora Club";

  const nameLine = params.firstName ? `Hi ${params.firstName},` : "Hi there,";

  const html = veiloraEmailTemplate({
    preheader: "We’d love to learn more about your brand — let’s schedule a quick call.",
    heading: "Let’s book a quick call",
    intro: nameLine,
    bodyHtml: `
      <p style="margin:0 0 12px 0;">
        Thank you again for applying to join <strong>Veilora Club</strong>${params.brandName ? ` with <strong>${params.brandName}</strong>` : ""}.
      </p>

      <p style="margin:0 0 12px 0;">
        We’d love to invite you to a short Zoom call to learn more about your brand, your best-sellers, and how we can work together.
      </p>

      <p style="margin:0 0 10px 0;"><strong>On the call, we’ll cover:</strong></p>
      <ul style="margin:0 0 12px 18px; padding:0;">
        <li style="margin:0 0 6px 0;">Your products and positioning</li>
        <li style="margin:0 0 6px 0;">How listing & visibility works on Veilora Club</li>
        <li style="margin:0;">Next steps if we move forward</li>
      </ul>

      <p style="margin:0;">
        ${params.schedulerUrl ? "Use the button below to choose a time that works for you:" : "Reply to this email with a few times that work for you, and we’ll confirm."}
      </p>
    `,
    cta: params.schedulerUrl
      ? { label: "Choose a time", href: params.schedulerUrl }
      : null,
    footerNote:
      "If you have anything you’d like us to review ahead of the call (lookbook, website, socials), feel free to reply and share it.",
  });

  return { subject, html };
}
