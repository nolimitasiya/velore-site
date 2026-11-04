type FeedbackTemplateInput = {
  type: "ISSUE" | "IDEA";
  id: string;
  category: string | null;
  message: string;
  contactName: string | null;
  contactEmail: string | null;
  pageUrl: string | null;
  productTitle: string | null;
  brandName: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function display(value: string | null): string {
  return value ? escapeHtml(value) : "Not provided";
}

export function feedbackAdminEmail(
  input: FeedbackTemplateInput
) {
  const isIssue = input.type === "ISSUE";

  const label = isIssue ? "Report an Issue" : "Share an Idea";

  const subject = isIssue
    ? `New issue reported — Veilora Club`
    : `New idea submitted — Veilora Club`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;line-height:1.6;">
      <h1 style="font-family:Georgia,serif;">Veilora Club</h1>

      <h2>${label}</h2>

      <p>A new ${isIssue ? "issue" : "idea"} has been submitted.</p>

      <p><strong>Reference:</strong> ${escapeHtml(input.id)}</p>

      ${
        isIssue
          ? `<p><strong>Category:</strong> ${display(input.category)}</p>`
          : ""
      }

      <p><strong>Message:</strong></p>

      <div style="padding:16px;background:#f7f7f7;border-radius:8px;white-space:pre-wrap;">${escapeHtml(input.message)}</div>

      <p><strong>Name:</strong> ${display(input.contactName)}</p>
      <p><strong>Email:</strong> ${display(input.contactEmail)}</p>

      ${
        input.productTitle
          ? `<p><strong>Product:</strong> ${display(input.productTitle)}</p>`
          : ""
      }

      ${
        input.brandName
          ? `<p><strong>Brand:</strong> ${display(input.brandName)}</p>`
          : ""
      }

      ${
        input.pageUrl
          ? `<p><strong>Page:</strong> ${display(input.pageUrl)}</p>`
          : ""
      }

      <hr style="border:0;border-top:1px solid #ddd;margin:24px 0;" />

      <p style="font-size:12px;color:#777;">
        This notification was generated automatically by Veilora Club.
      </p>
    </div>
  `;

  return { subject, html };
}

export function feedbackShopperEmail(
  input: Pick<
    FeedbackTemplateInput,
    "type" | "id" | "contactName"
  >
) {
  const isIssue = input.type === "ISSUE";

  const greeting = input.contactName
    ? `Hi ${escapeHtml(input.contactName)},`
    : "Hello,";

  const subject = isIssue
    ? "We've received your report — Veilora Club"
    : "Thank you for your idea — Veilora Club";

  const body = isIssue
    ? "Thank you for letting us know about an issue. Our team will review your report."
    : "Thank you for sharing your idea with us. We appreciate you helping shape Veilora Club.";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#222;line-height:1.7;">
      <h1 style="font-family:Georgia,serif;">Veilora Club</h1>

      <p>${greeting}</p>

      <p>${body}</p>

      <p><strong>Your reference:</strong> ${escapeHtml(input.id)}</p>

      <p>If we need any further information, we'll get in touch.</p>

      <p>With appreciation,<br/>
      <strong>The Veilora Club Team</strong></p>

      <hr style="border:0;border-top:1px solid #ddd;margin:24px 0;" />

      <p style="font-size:12px;color:#777;">
        The home of global modest fashion.
      </p>
    </div>
  `;

  return { subject, html };
}