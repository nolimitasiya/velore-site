import { Resend } from "resend";

export async function sendResetEmail(opts: {
  to: string;
  resetUrl: string;
  userType: "ADMIN" | "BRAND";
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_NO_REPLY;
  const replyTo = process.env.RESEND_REPLY_TO;

  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  if (!from) throw new Error("Missing RESEND_FROM_NO_REPLY");

  const resend = new Resend(apiKey);

  const subject =
    opts.userType === "ADMIN"
      ? "Reset your Veilora Admin password"
      : "Reset your Veilora Brand password";

  const roleLabel =
    opts.userType === "ADMIN" ? "Admin Portal" : "Brand Portal";

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.veiloraclub.com";

  const html = `
  <div style="background:#f5f5f5;padding:40px 20px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;padding:32px;border-radius:8px;">
      
      <h2 style="margin:0 0 16px;font-size:20px;">
        Veilora Club
      </h2>

      <h3 style="margin:0 0 16px;font-weight:600;">
        Reset your password
      </h3>

      <p style="margin:0 0 16px;color:#333;">
        You requested a password reset for your <strong>${roleLabel}</strong> account.
      </p>

      <p style="margin:0 0 24px;color:#333;">
        Click the button below to set a new password. This link expires in 60 minutes.
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a href="${opts.resetUrl}"
           style="
             display:inline-block;
             background:#000000;
             color:#ffffff;
             padding:12px 20px;
             text-decoration:none;
             font-size:14px;
             border-radius:4px;
           ">
          Reset Password
        </a>
      </div>

      <p style="margin:0 0 12px;font-size:13px;color:#555;">
        If you didn’t request this, you can safely ignore this email.
      </p>

      <hr style="margin:24px 0;border:none;border-top:1px solid #eee;" />

      <p style="font-size:12px;color:#777;margin:0;">
        Veilora Club<br/>
        ${baseUrl}
      </p>

    </div>
  </div>
  `;

  const text = `
Veilora Club

You requested a password reset for your ${roleLabel} account.

Reset your password using the link below:
${opts.resetUrl}

This link expires in 60 minutes.

If you did not request this, you can ignore this email.

${baseUrl}
`;

  await resend.emails.send({
    from,
    to: opts.to,
    subject,
    html,
    text,
    replyTo,
  });
}