import { Resend } from "resend";

export async function sendResetEmail(opts: {
  to: string;
  resetUrl: string;
  userType: "ADMIN" | "BRAND";
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_NO_REPLY;

  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  if (!from) throw new Error("Missing RESEND_FROM_NO_REPLY");

  const resend = new Resend(apiKey);

  const subject =
    opts.userType === "ADMIN"
      ? "Reset your Veilora Admin password"
      : "Reset your Veilora Brand password";

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6">
      <h2>${subject}</h2>
      <p>Click the link below to set a new password. This link expires in 60 minutes.</p>
      <p><a href="${opts.resetUrl}">${opts.resetUrl}</a></p>
      <p>If you didn’t request this, you can ignore this email.</p>
    </div>
  `;

  await resend.emails.send({
    from,
    to: opts.to,
    subject,
    html,
  });
}
