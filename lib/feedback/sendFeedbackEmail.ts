import "server-only";

import { resend } from "@/lib/resend/client";

type SendFeedbackEmailInput = {
  from: string;
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
  replyTo?: string;
};

export async function sendFeedbackEmail(
  input: SendFeedbackEmailInput
): Promise<{ id: string }> {
  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const { data, error } = await resend.emails.send(
  {
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
  },
  {
    idempotencyKey: input.idempotencyKey,
  }
);

  if (error) {
    throw new Error(
      `Feedback email delivery failed: ${error.message}`
    );
  }

  if (!data?.id) {
    throw new Error(
      "Resend did not confirm acceptance of the feedback email."
    );
  }

  return { id: data.id };
}