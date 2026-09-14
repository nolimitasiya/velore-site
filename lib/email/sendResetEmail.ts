import { Resend } from "resend";

export async function sendResetEmail(opts: {
  to: string;
  resetUrl: string;
  userType: "ADMIN" | "BRAND";
  name?: string | null;
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

  const roleLabel =
    opts.userType === "ADMIN"
      ? "Admin Portal"
      : "Brand Portal";

  const accountLabel =
    opts.userType === "ADMIN"
      ? "your Veilora Club admin account"
      : "your Veilora Club brand account";

  const subject =
    opts.userType === "ADMIN"
      ? "Reset your Veilora Admin password"
      : "Reset your Veilora Brand password";

  const rawFirstName =
  opts.name?.trim().split(/\s+/)[0] || null;

const firstName = rawFirstName
  ? rawFirstName.charAt(0).toUpperCase() +
    rawFirstName.slice(1).toLowerCase()
  : null;

  const greeting = firstName
    ? `Hi ${firstName},`
    : "Hi there,";

  const supportEmail =
    replyTo || "support@veiloraclub.com";

  const html = `
  <!doctype html>
  <html>
    <body
      style="
        margin:0;
        padding:0;
        background:#ffffff;
        color:#161111;
      "
    >
      <div
        style="
          width:100%;
          background:#ffffff;
          padding:42px 18px;
        "
      >
        <div
          style="
            max-width:620px;
            margin:0 auto;
            background:#ffffff;
          "
        >

          <!-- TOP BRAND -->
          <a
            href="${baseUrl}"
            style="
              display:block;
              background:#873247;
              padding:38px 24px;
              text-align:center;
              text-decoration:none;
            "
          >
            <div
              style="
                font-family:Georgia,'Times New Roman',serif;
                font-size:58px;
                line-height:1;
                font-weight:700;
                letter-spacing:-1px;
                color:#ffffff;
              "
            >
              Veilora Club
            </div>
          </a>

          <!-- CONTENT -->
          <div style="padding:26px 18px 0;">

            <div
              style="
                margin:0 0 16px;
                font-family:'Courier New',Courier,monospace;
                font-size:13px;
                letter-spacing:0.18em;
                text-transform:uppercase;
                color:#873247;
              "
            >
              ${roleLabel}
            </div>

            <h1
              style="
                margin:0 0 28px;
                font-family:Georgia,'Times New Roman',serif;
                font-size:38px;
                line-height:1.2;
                font-weight:500;
                color:#111111;
              "
            >
              Reset your password
            </h1>

            <p
              style="
                margin:0 0 22px;
                font-family:'Courier New',Courier,monospace;
                font-size:16px;
                line-height:1.65;
                color:#171717;
              "
            >
              ${greeting}
            </p>

            <p
              style="
                margin:0 0 22px;
                font-family:'Courier New',Courier,monospace;
                font-size:16px;
                line-height:1.65;
                color:#171717;
              "
            >
              We received a request to reset the password for ${accountLabel}.
            </p>

            <p
              style="
                margin:0 0 30px;
                font-family:'Courier New',Courier,monospace;
                font-size:16px;
                line-height:1.65;
                color:#171717;
              "
            >
              Click the button below to set a new password.
              This link expires in 60 minutes.
            </p>

            <!-- CTA -->
            <div style="margin:34px 0;">
              <a
                href="${opts.resetUrl}"
                style="
                  display:inline-block;
                  background:#873247;
                  color:#ffffff;
                  text-decoration:none;
                  font-family:'Courier New',Courier,monospace;
                  font-size:15px;
                  letter-spacing:0.12em;
                  text-transform:uppercase;
                  padding:18px 30px;
                "
              >
                Reset my password →
              </a>
            </div>

            <p
              style="
                margin:0 0 24px;
                font-family:'Courier New',Courier,monospace;
                font-size:16px;
                line-height:1.65;
                color:#171717;
              "
            >
              If you didn't request this, you can safely ignore this email.
              Your password will remain unchanged.
            </p>

            <p
              style="
                margin:28px 0 0;
                font-family:'Courier New',Courier,monospace;
                font-size:16px;
                line-height:1.65;
                color:#171717;
              "
            >
              Best,<br />
              The Veilora Club Team
            </p>

            <!-- DIVIDER -->
            <div
              style="
                border-top:1px solid #a95a6c;
                margin:34px 0 22px;
              "
            ></div>

            <!-- HELP -->
            <p
              style="
                margin:0 0 6px;
                font-family:Arial,sans-serif;
                font-size:11px;
                text-transform:uppercase;
                letter-spacing:0.08em;
                color:#6f595f;
              "
            >
              Need help?
            </p>

            <p
              style="
                margin:0;
                font-family:Arial,sans-serif;
                font-size:12px;
                line-height:1.6;
                color:#6f595f;
              "
            >
              Reply to this email or contact us at
              <a
                href="mailto:${supportEmail}"
                style="color:#873247;"
              >
                ${supportEmail}
              </a>.
            </p>

            <!-- BOTTOM BRAND -->
            <div
              style="
                text-align:center;
                padding:42px 0 12px;
              "
            >
              <a
                href="${baseUrl}"
                style="
                  text-decoration:none;
                  display:inline-block;
                "
              >
                <div
                  style="
                    font-family:Georgia,'Times New Roman',serif;
                    font-size:44px;
                    line-height:1;
                    font-weight:700;
                    color:#873247;
                  "
                >
                  Veilora Club
                </div>

                <div
                  style="
                    margin-top:8px;
                    font-family:Georgia,'Times New Roman',serif;
                    font-size:11px;
                    font-weight:700;
                    color:#873247;
                  "
                >
                  The Home of Global Modest Fashion
                </div>
              </a>
            </div>

          </div>
        </div>
      </div>
    </body>
  </html>
  `;

  const text = `
Veilora Club
${roleLabel}

Reset your password

${greeting}

We received a request to reset the password for ${accountLabel}.

Reset your password:
${opts.resetUrl}

This link expires in 60 minutes.

If you didn't request this, you can safely ignore this email.
Your password will remain unchanged.

Best,
The Veilora Club Team

Need help?
${supportEmail}

Veilora Club
The Home of Global Modest Fashion
  `.trim();

  const { data, error } =
    await resend.emails.send({
      from,
      to: opts.to,
      subject,
      html,
      text,
      ...(replyTo ? { replyTo } : {}),
    });

  if (error) {
    throw new Error(
      `Resend ${opts.userType.toLowerCase()} password reset failed: ${error.message}`
    );
  }

  console.log(
    `[${opts.userType.toLowerCase()}-reset-email] sent`,
    data?.id
  );
}