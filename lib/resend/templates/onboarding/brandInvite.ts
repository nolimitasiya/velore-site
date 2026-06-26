import { FROM_ONBOARDING } from "../../client";
import { sendEmail } from "../../send";
import { veiloraEmailTemplate } from "../base/veiloraBase";

export async function sendBrandInviteEmail(opts: {
  to: string;
  brandName: string;
  inviteLink: string;
  senderName?: string;
}) {
  const subject = "Welcome to Veilora Club | Let's get started ✨";

  const html = veiloraEmailTemplate({
    preheader: `Welcome to Veilora Club. Your onboarding journey starts here.`,

    heading: "Welcome to Veilora Club",

    intro: "Hi there,",

    bodyHtml: `
      <div style="text-align:center; max-width:520px; margin:0 auto;">

        <p>
          Congratulations and welcome to Veilora Club.
        </p>

        <p>
          We're delighted to invite ${opts.brandName}to join our growing community of modest fashion brands from around the world.
        </p>

        <p>
          Your invitation gives you access to your dedicated Brand Portal, where you'll be able to complete your profile, upload your collections and begin your onboarding journey.
        </p>

        <p>
          The onboarding process only takes a few minutes, and we'll guide you through every step along the way.
        </p>

        <p>
          Once your profile has been submitted, our team will review everything before your brand goes live on Veilora Club.
        </p>

        <p style="margin-top:24px;">
          We can't wait to welcome you.
        </p>

        <p style="
          margin:4px 0 0 0;
          font-family:'Abril Fatface', Georgia, 'Times New Roman', serif;
          font-size:16px;
        ">
          Asiya 🤍
        </p>

      </div>
    `,

    cta: {
      label: "Begin onboarding",
      href: opts.inviteLink,
    },

    footerNote:
      "Your invitation is unique to your brand. If you have any questions before getting started, simply reply to this email and we'll be happy to help.",
  });

  return sendEmail({
    from: FROM_ONBOARDING,
    to: opts.to,
    subject,
    html,
  });
}