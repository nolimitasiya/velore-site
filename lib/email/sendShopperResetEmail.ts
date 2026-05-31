import { Resend } from "resend";

export async function sendShopperResetEmail(opts: {
  to: string;
  resetUrl: string;
  firstName?: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_NO_REPLY;
  const replyTo = process.env.RESEND_REPLY_TO;

  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  if (!from) throw new Error("Missing RESEND_FROM_NO_REPLY");

  const resend = new Resend(apiKey);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.veiloraclub.com";
  const greeting = opts.firstName ? `Hi ${opts.firstName},` : "Hi there,";

  const html = `
  <div style="background:#faf8f4;padding:40px 20px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;padding:40px 32px;border-radius:12px;border:1px solid #e8ddd4;">

      <div style="background:#7B2D3E;margin:-40px -32px 32px;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:22px;letter-spacing:0.08em;color:#ffffff;font-weight:400;">
          Veilora Club
        </h1>
        <p style="margin:4px 0 0;font-size:11px;letter-spacing:0.25em;color:rgba(255,255,255,0.5);text-transform:uppercase;">
          My Account
        </p>
      </div>

      <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#7B2D3E;">
        Password Reset
      </p>

      <h2 style="margin:0 0 16px;font-size:24px;font-weight:400;color:#1a0a0e;line-height:1.3;">
        ${greeting}
      </h2>

      <p style="margin:0 0 16px;color:#6b5c4e;font-size:14px;line-height:1.7;">
        We received a request to reset your Veilora Club password. Click the button below to set a new one.
      </p>

      <p style="margin:0 0 24px;color:#a89280;font-size:13px;line-height:1.7;">
        This link expires in <strong style="color:#6b5c4e;">60 minutes</strong>. If you didn't request this, you can safely ignore this email.
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a href="${opts.resetUrl}"
           style="display:inline-block;background:#7B2D3E;color:#ffffff;padding:14px 28px;text-decoration:none;font-size:13px;letter-spacing:0.08em;border-radius:4px;">
          Reset my password →
        </a>
      </div>

      <div style="background:#faf8f4;border-radius:8px;padding:14px 18px;margin:24px 0;">
        <p style="margin:0;font-size:12px;color:#a89280;word-break:break-all;">
          Or copy this link: <a href="${opts.resetUrl}" style="color:#7B2D3E;">${opts.resetUrl}</a>
        </p>
      </div>

      <hr style="margin:28px 0;border:none;border-top:1px solid #e8ddd4;" />

      <p style="font-size:12px;color:#a89280;margin:0;line-height:1.6;">
        You're receiving this because a password reset was requested for your Veilora Club account.<br/>
        If this wasn't you, no action is needed.
      </p>

      <p style="font-size:12px;color:#a89280;margin:12px 0 0;">
        Veilora Club &nbsp;·&nbsp;
        <a href="${baseUrl}" style="color:#7B2D3E;text-decoration:none;">${baseUrl.replace("https://", "")}</a>
      </p>
    </div>
  </div>
  `;

  const text = `
Veilora Club — Password Reset

${greeting}

We received a request to reset your Veilora Club password.

Reset your password here:
${opts.resetUrl}

This link expires in 60 minutes.
If you didn't request this, you can safely ignore this email.

Veilora Club
${baseUrl}
  `;

  await resend.emails.send({
    from,
    to: opts.to,
    subject: "Reset your Veilora Club password",
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  });
}