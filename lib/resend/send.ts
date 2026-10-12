import { resend } from "./client";

type SendEmailArgs = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail(args: SendEmailArgs) {
  if (!resend) {
    console.error("[Resend] Email not sent: RESEND_API_KEY is missing.");
    throw new Error("Email service is not configured.");
  }

  const { data, error } = await resend.emails.send({
    from: args.from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    replyTo: args.replyTo,
  });

  if (error) {
    console.error("[Resend] Email rejected:", {
      name: error.name,
      message: error.message,
    });

    throw new Error(`Resend email failed: ${error.message}`);
  }

  if (!data?.id) {
    console.error("[Resend] Email response missing an ID.");
    throw new Error("Resend did not confirm email acceptance.");
  }

  return {
    ok: true as const,
    id: data.id,
  };
}