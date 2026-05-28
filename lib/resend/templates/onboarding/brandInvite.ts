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
        You can now create your brand account on <strong>Veilora Club</strong>, the platform connecting global Muslim and modest brands in one place.
      </p>

      <p style="margin:0 0 12px 0;">
        Once your account is set up, you’ll be able to access your brand portal and begin preparing your profile and product information for review.
      </p>

      <p style="margin:0; color:#6b6b6b; font-size:13px;">
        This link is personal to your brand, so please do not forward it.
      </p>
    `,
    cta: { label: "Create brand account", href: opts.inviteLink },
    footerNote:
      "If you have any questions during onboarding, simply reply to this email and we’ll be happy to help.",
  });

  return sendEmail({
    from: FROM_ONBOARDING,
    to: opts.to,
    subject,
    html,
  });
}
