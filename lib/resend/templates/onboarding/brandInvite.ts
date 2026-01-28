import { FROM_ONBOARDING } from "../../client";
import { sendEmail } from "../../send";

export async function sendBrandInviteEmail(opts: {
  to: string;
  brandName: string;
  inviteLink: string;
  senderName?: string;
}) {
  const sender = opts.senderName ?? "Asiya";
  const subject = `You’ve been invited to list ${opts.brandName} on Veilora Club`;

  const html = `
  <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">
    <h2 style="margin:0 0 12px;">${opts.brandName}, welcome 👋</h2>
    <p style="margin:0 0 12px;">
      ${sender} has invited you to join <strong>Veilora Club</strong> — a curated hub for modest fashion brands.
    </p>
    <p style="margin:0 0 16px;">
      You can upload your products via a simple CSV (takes ~5 minutes). Once imported, we review & publish on our side.
    </p>
    <p style="margin:0 0 16px;">
      <a href="${opts.inviteLink}" style="display:inline-block; padding:10px 14px; border-radius:10px; text-decoration:none; background:#111; color:#fff;">
        Accept invite
      </a>
    </p>
    <p style="margin:0 0 6px; color:#666; font-size:12px;">
      This invite link is personal — please don’t forward it.
    </p>
  </div>`;

  return sendEmail({
    from: FROM_ONBOARDING,
    to: opts.to,
    subject,
    html,
  });
}
