import { resend, FROM_MARKETING } from "./client";

export async function sendNewsletterWelcomeEmail(opts: {
  to: string;
  firstName?: string;
}) {
  const name = opts.firstName ? ` ${opts.firstName}` : "";
  const subject = "Welcome — you’re in 💌";

  const html = `
  <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5;">
    <h2 style="margin:0 0 12px;">Welcome${name}!</h2>
    <p style="margin:0 0 12px;">
      Thanks for joining our newsletter. You’ll get early access to drops, modest styling edits, and brand spotlights.
    </p>
    <p style="margin:0 0 12px;">
      Reply to this email with what you’re shopping for (abaya, dresses, workwear, swim, etc.) and we’ll tailor what we send.
    </p>
    <p style="margin:0; color:#666; font-size:12px;">
      If you didn’t sign up, you can ignore this email.
    </p>
  </div>`;

  if (!resend) return;

  await resend.emails.send({
    from: process.env.RESEND_FROM_MARKETING!,
    replyTo: "marketing@Veilora Club.com",
    to: opts.to,
    subject: "Welcome — you’re in 💌",
    html: `<p>Thanks for joining Veilora Club.</p>`,
  });
}
  
