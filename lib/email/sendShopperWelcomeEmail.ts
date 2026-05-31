import { Resend } from "resend";

export async function sendShopperWelcomeEmail(opts: {
  to: string;
  firstName?: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_NO_REPLY;
  const replyTo = process.env.RESEND_REPLY_TO;

  if (!apiKey) throw new Error("Missing RESEND_API_KEY");
  if (!from) throw new Error("Missing RESEND_FROM_NO_REPLY");

  const resend = new Resend(apiKey);

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.veiloraclub.com";

  const greeting = opts.firstName ? `Hi ${opts.firstName},` : "Welcome,";

  const html = `
  <div style="background:#faf8f4;padding:40px 20px;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;padding:40px 32px;border-radius:12px;border:1px solid #e8ddd4;">

      <!-- Header -->
      <div style="background:#7B2D3E;margin:-40px -32px 32px;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:22px;letter-spacing:0.08em;color:#ffffff;font-weight:400;">
          Veilora Club
        </h1>
        <p style="margin:4px 0 0;font-size:11px;letter-spacing:0.25em;color:rgba(255,255,255,0.5);text-transform:uppercase;">
          Global Modest Fashion
        </p>
      </div>

      <!-- Body -->
      <p style="margin:0 0 8px;font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#7B2D3E;">
        Welcome to Veilora Club
      </p>

      <h2 style="margin:0 0 16px;font-size:24px;font-weight:400;color:#1a0a0e;line-height:1.3;">
        ${greeting}
      </h2>

      <p style="margin:0 0 16px;color:#6b5c4e;font-size:14px;line-height:1.7;">
        Your account is ready. You can now save your favourite pieces, discover global modest fashion brands, and build your personal wishlist.
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a href="${baseUrl}/account"
           style="
             display:inline-block;
             background:#7B2D3E;
             color:#ffffff;
             padding:14px 28px;
             text-decoration:none;
             font-size:13px;
             letter-spacing:0.08em;
             border-radius:4px;
           ">
          Go to my account →
        </a>
      </div>

      <div style="background:#faf8f4;border-radius:8px;padding:16px 20px;margin:24px 0;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.12em;color:#7B2D3E;">
          What you can do
        </p>
        <p style="margin:0 0 6px;font-size:13px;color:#6b5c4e;">♡ &nbsp;Save pieces to your wishlist</p>
        <p style="margin:0 0 6px;font-size:13px;color:#6b5c4e;">🌍 &nbsp;Discover brands from around the world</p>
        <p style="margin:0;font-size:13px;color:#6b5c4e;">✦ &nbsp;Read the Veilora Diary</p>
      </div>

      <hr style="margin:28px 0;border:none;border-top:1px solid #e8ddd4;" />

      <p style="font-size:12px;color:#a89280;margin:0;line-height:1.6;">
        You're receiving this because you created a Veilora Club account using this email address.
        If this wasn't you, you can safely ignore this email.
      </p>

      <p style="font-size:12px;color:#a89280;margin:12px 0 0;">
        Veilora Club &nbsp;·&nbsp;
        <a href="${baseUrl}" style="color:#7B2D3E;text-decoration:none;">${baseUrl.replace("https://", "")}</a>
      </p>
    </div>
  </div>
  `;

  const text = `
Welcome to Veilora Club${opts.firstName ? `, ${opts.firstName}` : ""}!

Your account is ready. You can now save your favourite pieces, discover global modest fashion brands, and build your personal wishlist.

Go to your account: ${baseUrl}/account

What you can do:
- Save pieces to your wishlist
- Discover brands from around the world
- Read the Veilora Diary

You're receiving this because you created a Veilora Club account using this email address.
If this wasn't you, you can safely ignore this email.

Veilora Club
${baseUrl}
  `;

  await resend.emails.send({
    from,
    to: opts.to,
    subject: "Welcome to Veilora Club ✦",
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  });
}