import { Resend } from "resend";

export async function sendShopperEmailChangeCode(opts: {
  to: string;
  firstName?: string | null;
  code: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_NO_REPLY;
  const replyTo = process.env.RESEND_REPLY_TO;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  if (!from) {
    throw new Error("Missing RESEND_FROM_NO_REPLY");
  }

  const resend = new Resend(apiKey);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.veiloraclub.com";

  const greeting = opts.firstName
    ? `Hi ${opts.firstName},`
    : "Hi,";

  const html = `
  <div style="background:#faf8f4;padding:40px 20px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;padding:40px 32px;border-radius:12px;border:1px solid #e8ddd4;">

      <div style="background:#7B2D3E;margin:-40px -32px 32px;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:22px;letter-spacing:0.08em;color:#ffffff;font-weight:400;">
          Veilora Club
        </h1>

        <p style="margin:4px 0 0;font-size:11px;letter-spacing:0.25em;color:rgba(255,255,255,0.5);text-transform:uppercase;">
          Global Modest Fashion
        </p>
      </div>

      <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#7B2D3E;">
        Verify your email
      </p>

      <h2 style="margin:0 0 16px;font-size:24px;font-weight:400;color:#1a0a0e;line-height:1.3;">
        ${greeting}
      </h2>

      <p style="margin:0;color:#6b5c4e;font-size:14px;line-height:1.7;">
        Use the verification code below to confirm this email address for your Veilora Club account.
      </p>

      <div style="margin:32px 0;text-align:center;">
        <div style="
          display:inline-block;
          background:#faf8f4;
          border:1px solid #e8ddd4;
          border-radius:8px;
          padding:18px 28px;
          font-size:30px;
          letter-spacing:0.28em;
          color:#7B2D3E;
          font-weight:600;
        ">
          ${opts.code}
        </div>
      </div>

      <p style="margin:0;color:#6b5c4e;font-size:13px;line-height:1.7;">
        This code expires in 15 minutes.
      </p>

      <p style="margin:16px 0 0;color:#6b5c4e;font-size:13px;line-height:1.7;">
        If you didn't request this change, you can ignore this email. Your current Veilora Club email address will remain unchanged.
      </p>

      <hr style="margin:28px 0;border:none;border-top:1px solid #e8ddd4;" />

      <p style="font-size:12px;color:#a89280;margin:0;">
        Veilora Club &nbsp;·&nbsp;
        <a
          href="${baseUrl}"
          style="color:#7B2D3E;text-decoration:none;"
        >
          ${baseUrl.replace("https://", "")}
        </a>
      </p>

    </div>
  </div>
  `;

  const text = `
${greeting}

Use this verification code to confirm this email address for your Veilora Club account:

${opts.code}

This code expires in 15 minutes.

If you didn't request this change, you can ignore this email. Your current Veilora Club email address will remain unchanged.

Veilora Club
${baseUrl}
  `;

  await resend.emails.send({
    from,
    to: opts.to,
    subject: "Verify your new email address — Veilora Club",
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  });
}