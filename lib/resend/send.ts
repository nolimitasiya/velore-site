import { resend } from "./client";

type SendEmailArgs = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail(args: SendEmailArgs) {
  console.log("📧 sendEmail called:", {
    hasResend: Boolean(resend),
    subject: args.subject,
    to: args.to,
    from: args.from,
  });

  if (!resend) {
    console.warn("❌ Resend is NULL — API key not loaded. Email skipped.");
    return { ok: false as const, skipped: true as const };
  }

  const result = await resend.emails.send({
    from: args.from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    replyTo: args.replyTo,
  });

  console.log("✅ Resend response:", result);
  return { ok: true as const };
}
