import { Resend } from "resend";
import { contactAdminNotificationEmail } from "./templates/contact/contactAdminNotification";
import { contactAutoReplyEmail } from "./templates/contact/contactAutoReply";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendContactEmails(params: {
  name: string;
  email: string;
  message: string;
}) {
  if (!resend) {
    throw new Error("RESEND_API_KEY is missing.");
  }

  const toEmail = process.env.CONTACT_TO_EMAIL;
  const fromEmail = process.env.CONTACT_FROM_EMAIL;

  if (!toEmail) {
    throw new Error("CONTACT_TO_EMAIL is missing.");
  }

  if (!fromEmail) {
    throw new Error("CONTACT_FROM_EMAIL is missing.");
  }

  const adminTemplate = contactAdminNotificationEmail({
    name: params.name,
    email: params.email,
    message: params.message,
  });

  const autoReplyTemplate = contactAutoReplyEmail({
    name: params.name,
  });

  const adminResult = await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    replyTo: params.email,
    subject: adminTemplate.subject,
    html: adminTemplate.html,
  });

  const autoReplyResult = await resend.emails.send({
    from: fromEmail,
    to: params.email,
    subject: autoReplyTemplate.subject,
    html: autoReplyTemplate.html,
  });

  return {
    adminResult,
    autoReplyResult,
  };
}