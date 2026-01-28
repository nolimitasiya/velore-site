import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) throw new Error("Missing RESEND_API_KEY");

export const resend = new Resend(apiKey);

export async function sendBrandInviteEmail(opts: {
  to: string;
  companyName: string;
  onboardingUrl: string;
  expiresAt: Date;
}) {
  const from = process.env.RESEND_FROM;
  if (!from) throw new Error("Missing RESEND_FROM");

  const subject = `You're invited to join ${opts.companyName} on Veilora Club`;

  const expiresText = opts.expiresAt.toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2 style="margin:0 0 12px;">Welcome to Veilora Club</h2>
      <p>You’ve been invited to access the brand portal for <b>${opts.companyName}</b>.</p>
      <p>
        <a href="${opts.onboardingUrl}" style="display:inline-block;padding:10px 14px;background:#000;color:#fff;text-decoration:none;border-radius:8px;">
          Complete onboarding
        </a>
      </p>
      <p style="color:#555;font-size:12px;margin-top:14px;">
        This link expires on <b>${expiresText}</b>.
      </p>
      <p style="color:#555;font-size:12px;">
        If you weren’t expecting this email, you can ignore it.
      </p>
    </div>
  `;

  await resend.emails.send({
    from,
    to: opts.to,
    subject,
    html,
  });
}
