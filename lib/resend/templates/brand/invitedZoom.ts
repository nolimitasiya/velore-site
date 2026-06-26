import { veiloraEmailTemplate } from "../base/veiloraBase";

function capitalizeFirstLetter(name?: string) {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

export function brandInvitedZoomEmail(params: {
  firstName?: string;
  brandName?: string;
  schedulerUrl?: string; // Calendly/Cal.com link (optional)
}) {
  const subject = "Let's book a quick call | Veilora Club";

  const formattedName = capitalizeFirstLetter(params.firstName);

const nameLine = formattedName ? `Hi ${formattedName},` : "Hi there,";

  const html = veiloraEmailTemplate({
    preheader: "We’d love to learn more about your brand — let’s schedule a quick call.",
    heading: "Let’s book a quick call",
    intro: nameLine,
    bodyHtml: `
      <p style="margin:0 0 12px 0;">
        Thank you again for applying to join Veilora Club${params.brandName ? ` with <strong>${params.brandName}</strong>` : ""}.
      </p>

      <p style="margin:0 0 12px 0;">
        We’d love to invite you to a short Zoom call to learn more about your brand.
      </p>
<div style="color:#444444; max-width:420px; margin:18px auto; text-align:left;">
  

  <div style="color:#444444; max-width:470px; margin:22px auto; text-align:left;">

  <p style="text-align:center; margin:0 0 18px 0;">
    <strong>During our conversation, we'll cover:</strong>
  </p>

  <ul style="
      margin:0;
      padding-left:22px;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Inter,Arial,sans-serif;
      font-size:16px;
      line-height:1.8;
      color:#444444;
  ">

    <li style="margin-bottom:10px;">
      Discover your brand.
    </li>

    <li style="margin-bottom:10px;">
      Explore the platform and showcase how brands are featured.
    </li>

    <li>
      Walk through the next steps should we decide to move forward together.
    </li>

  </ul>

</div>
</div>

      ${params.schedulerUrl
? "Please choose a time that works best for you.:"
: "Simply reply to this email with a few dates and times that work for you, and we'll be happy to arrange the call."}
      </p>
    `,
    cta: params.schedulerUrl
      ? { label: "Choose a time", href: params.schedulerUrl }
      : null,
    footerNote:
  "If there's anything you'd like us to look at before, please don't hesitate to reply to this email.",
  });

  return { subject, html };
}
