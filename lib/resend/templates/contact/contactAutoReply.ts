import { veiloraEmailTemplate } from "../base/veiloraBase";

export function contactAutoReplyEmail(params: { name: string }) {
  const subject = "We’ve received your message ✨";

  const name =
    params.name.charAt(0).toUpperCase() + params.name.slice(1);

  const html = veiloraEmailTemplate({
    preheader: "Thank you for contacting Veilora Club.",
    heading: "We’ve received your message",
    intro: `Salam ${name},`,
    bodyHtml: `
      <div style="text-align:center; max-width:520px; margin:0 auto;">
        <p>
          Thank you for reaching out to <strong>Veilora Club</strong>.
        </p>

        <p>
          We’ve received your message and our team will get back to you as soon as possible,
          usually within <strong>24–48 hours</strong>.
        </p>

        <p>
          We appreciate your patience and look forward to helping you.
        </p>

        <p style="margin-top:24px;">
          With care,
        </p>

        <p style="margin:4px 0 0 0; font-family:'Abril Fatface', Georgia, 'Times New Roman', serif; font-size:14px;">
          Veilora Club <span style="font-family:inherit;"></span>
        </p>
      </div>
    `,
    footerNote:
      "You’re receiving this email because you submitted a contact form on Veilora Club.",
  });

  return { subject, html };
}