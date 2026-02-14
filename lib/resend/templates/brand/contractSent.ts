// C:\Users\Asiya\projects\dalra\lib\resend\templates\brand\contractSent.ts
import { veiloraEmailTemplate } from "../base/veiloraBase";

function cap(name?: string | null) {
  if (!name) return "";
  return name.trim().toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function brandContractSentEmail(params: { firstName?: string; contractUrl: string }) {
  const firstName = cap(params.firstName);
  const subject = "Your Veilora Club contract — Next step ✍🏽";

  const html = veiloraEmailTemplate({
    preheader: "Please review and sign your contract to proceed with onboarding.",
    heading: "Contract sent",
    intro: firstName ? `Hi ${firstName},` : "Hi there,",
    bodyHtml: `
      <p style="margin:0 0 12px 0;">
        Excited to move forward with <strong>Veilora Club</strong>.
        Please review and sign your contract using the link below:
      </p>

      <p style="margin:0 0 16px 0;">
        <a href="${params.contractUrl}" target="_blank" rel="noreferrer"
           style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-size:14px;">
          Review & sign contract
        </a>
      </p>

      <p style="margin:0 0 12px 0; color:#6b6b6b; font-size:13px;">
        If the button doesn’t work, copy and paste this link into your browser:
        <br/>
        <span style="word-break:break-all;">${params.contractUrl}</span>
      </p>

      <p style="margin:0; color:#6b6b6b; font-size:13px;">
        Once it’s signed, we’ll send your onboarding access straight away.
      </p>
    `,
  });

  return { subject, html };
}
