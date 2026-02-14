// C:\Users\Asiya\projects\dalra\lib\resend\templates\brand\contractSigned.ts
import { veiloraEmailTemplate } from "../base/veiloraBase";

function cap(name?: string | null) {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function brandContractSignedEmail(params: { firstName?: string }) {
  const firstName = cap(params.firstName);
  const subject = "Contract received — you’re officially in ✨";

  const html = veiloraEmailTemplate({
    preheader: "We’ve received your signed contract. Next: onboarding access.",
    heading: "Contract signed",
    intro: firstName ? `Hi ${firstName},` : "Hi there,",
    bodyHtml: `
      <p style="margin:0 0 12px 0;">
        Thank you, we’ve received your signed contract.
      </p>

      <p style="margin:0 0 12px 0;">
        Next step: we’ll send your onboarding access shortly so you can set up your brand profile
        and start adding products.
      </p>

      <p style="margin:0; color:#6b6b6b; font-size:13px;">
        If you have any questions, just reply to this email.
      </p>
    `,
  });

  return { subject, html };
}
