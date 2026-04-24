import { veiloraEmailTemplate } from "../base/veiloraBase";

export function contactAdminNotificationEmail(params: {
  name: string;
  email: string;
  message: string;

}) {
  const subject = "New message from Veilora Club";

  const formattedMessage = params.message.replace(/\n/g, "<br />");

  const html = veiloraEmailTemplate({
    preheader: "New contact enquiry received.",
    heading: "New message received",
    intro: "",
    bodyHtml: `
      <div style="max-width:520px; margin:0 auto;">

        <p>
          You’ve received a new message through Veilora Club.
        </p>

        <p style="margin-top:16px;">
          <strong>Name:</strong> ${params.name}
        </p>

        <p>
          <strong>Email:</strong>
          <a href="mailto:${params.email}">${params.email}</a>
        </p>

        <div style="margin-top:24px;">
          <p><strong>Message:</strong></p>
          <p style="line-height:1.7;">
            ${formattedMessage}
          </p>
        </div>

        <p style="margin-top:24px;">
          With care,
        </p>

        <p style="margin:4px 0 0 0; font-family:'Abril Fatface', Georgia, serif;">
          Veilora Club
        </p>

      </div>
    `,
    footerNote: "Sent via Veilora Club contact form.",
  });

  return { subject, html };
}