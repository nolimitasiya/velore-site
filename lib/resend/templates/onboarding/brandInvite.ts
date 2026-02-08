import { FROM_ONBOARDING } from "../../client";
import { sendEmail } from "../../send";
import { veiloraEmailTemplate } from "../base/veiloraBase";

export async function sendBrandInviteEmail(opts: {
  to: string;
  brandName: string;
  inviteLink: string;
  senderName?: string;
}) {
  const sender = opts.senderName ?? "Asiya";
  const subject = `You’ve been invited to list ${opts.brandName} on Veilora Club`;

  const html = veiloraEmailTemplate({
    preheader: `You’ve been invited to list ${opts.brandName} on Veilora Club.`,
    heading: `${opts.brandName}, welcome`,
    intro: `${sender} has invited you to join Veilora Club 👋`,
    bodyHtml: `
      <p style="margin:0 0 12px 0;">
        You’ve been invited to join <strong>Veilora Club</strong> — a curated hub for modest fashion brands.
      </p>

      <p style="margin:0 0 12px 0;">
        You can upload your products via a simple CSV (takes ~5 minutes). Once imported, we review & publish on our side.
      </p>

      <p style="margin:0; color:#6b6b6b; font-size:13px;">
        This invite link is personal — please don’t forward it.
      </p>
    `,
    cta: { label: "Accept invite", href: opts.inviteLink },
    footerNote: "If you need help with the CSV import, reply to this email and we’ll help you quickly.",
  });

  return sendEmail({
    from: FROM_ONBOARDING,
    to: opts.to,
    subject,
    html,
  });
}
