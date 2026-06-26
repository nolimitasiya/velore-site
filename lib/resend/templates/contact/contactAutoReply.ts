import { veiloraEmailTemplate } from "../base/veiloraBase";

export function contactAutoReplyEmail(params: { name: string }) {
  const subject = "We've received your message | Veilora Club";

  function capitalizeFirstName(name: string) {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

  const name = capitalizeFirstName(params.name);

  const html = veiloraEmailTemplate({
    preheader: "Thank you for contacting Veilora Club.",
    heading: "We’ve received your message",
    intro: `Salam ${name},`,
    bodyHtml: `
  <div style="text-align:center; max-width:520px; margin:0 auto;">

    <p>
      Thank you for getting in touch with <strong>Veilora Club</strong>.
    </p>

    <p>
      We've received your message and truly appreciate you taking the time to reach out.
    </p>

    <p>
      Our team will review your enquiry and get back to you as soon as possible, typically within <strong>24–48 hours</strong>.
    </p>

    <p>
      In the meantime, if your enquiry is urgent, simply reply to this email and we'll do our best to assist you.
    </p>

    <p style="margin-top:24px;">
      With love,
    </p>

    <p style="margin:4px 0 0 0;
              font-family:'Abril Fatface', Georgia, 'Times New Roman', serif;
              font-size:16px;">
      Veilora Club 🤍
    </p>

  </div>
`,
    footerNote:
  "You're receiving this email because you contacted Veilora Club through our website.",
  });

  return { subject, html };
}