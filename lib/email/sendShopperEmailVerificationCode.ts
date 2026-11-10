import { Resend } from "resend";
import { getSiteBaseUrl } from "@/lib/config/siteUrl";
import {
  SHOPPER_EMAIL_VERIFICATION_CODE_EXPIRY_MINUTES,
} from "@/lib/auth/shopperEmailVerificationCode";

type VerificationEmailOptions = {
  to: string;
  firstName?: string | null;
  code: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendShopperEmailVerificationCode(
  opts: VerificationEmailOptions
): Promise<void> {
  if (!/^\d{6}$/.test(opts.code)) {
    throw new Error("Invalid verification code format.");
  }

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
  const baseUrl = getSiteBaseUrl();

  const greeting = opts.firstName?.trim()
    ? `Hi ${opts.firstName.trim()},`
    : "Hello,";

  const safeGreeting = escapeHtml(greeting);
  const expiryMinutes =
    SHOPPER_EMAIL_VERIFICATION_CODE_EXPIRY_MINUTES;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Verify your Veilora Club email</title>
      </head>

      <body style="margin:0;padding:0;background:#faf8f4;font-family:Arial,Helvetica,sans-serif;color:#1a0a0e;">
        <div style="padding:40px 16px;">
          <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e8ddd4;border-radius:12px;overflow:hidden;">

            <div style="background:#7B2D3E;padding:32px 24px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:400;letter-spacing:0.08em;">
                Veilora Club
              </h1>

              <p style="margin:10px 0 0;color:#ead9dd;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;">
                The home of global modest fashion
              </p>
            </div>

            <div style="padding:40px 32px;">
              <p style="margin:0 0 12px;color:#7B2D3E;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">
                One final step
              </p>

              <h2 style="margin:0 0 24px;font-size:26px;font-weight:400;line-height:1.3;">
                Verify your email address
              </h2>

              <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#6b5c4e;">
                ${safeGreeting}
              </p>

              <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#6b5c4e;">
                Thank you for joining Veilora Club.
                To complete your registration, enter the
                verification code below.
              </p>

              <div style="background:#faf8f4;border:1px solid #e8ddd4;border-radius:8px;padding:24px 12px;text-align:center;">
                <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#a89280;">
                  Your verification code
                </p>

                <p style="margin:0;color:#7B2D3E;font-size:36px;font-weight:600;letter-spacing:0.22em;font-family:Arial,Helvetica,sans-serif;">
                  ${opts.code}
                </p>
              </div>

              <p style="margin:20px 0 0;font-size:13px;line-height:1.7;color:#6b5c4e;text-align:center;">
                This code expires in ${expiryMinutes} minutes.
              </p>

              <p style="margin:28px 0 0;font-size:14px;line-height:1.7;color:#6b5c4e;">
                Once verified, you can continue exploring
                Veilora Club and saving your favourite pieces.
              </p>

              <hr style="margin:32px 0;border:0;border-top:1px solid #e8ddd4;" />

              <p style="margin:0;font-size:12px;line-height:1.7;color:#a89280;">
                If you didn't create a Veilora Club account,
                you can safely ignore this email.
                Never share your verification code with anyone.
              </p>
            </div>

            <div style="padding:20px 32px;background:#faf8f4;text-align:center;">
              <p style="margin:0;font-size:12px;color:#a89280;">
                Veilora Club
              </p>

              <a href="${escapeHtml(baseUrl)}" style="display:inline-block;margin-top:8px;font-size:12px;color:#7B2D3E;text-decoration:none;">
                Visit Veilora Club
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = [
    "VEILORA CLUB",
    "",
    "Verify your email address",
    "",
    greeting,
    "",
    "Thank you for joining Veilora Club.",
    "Enter the following code to complete your registration:",
    "",
    opts.code,
    "",
    `This code expires in ${expiryMinutes} minutes.`,
    "",
    "If you didn't create a Veilora Club account,",
    "you can safely ignore this email.",
    "Never share your verification code with anyone.",
    "",
    "Veilora Club",
    baseUrl,
  ].join("\n");

  const { data, error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: "Verify your email | Veilora Club",
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  });

  if (error) {
    throw new Error(
      `Verification email delivery failed: ${error.name}`
    );
  }

  if (!data?.id) {
    throw new Error(
      "Verification email provider did not confirm acceptance."
    );
  }
}