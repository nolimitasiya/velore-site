export const FEEDBACK_ISSUE_CATEGORIES = [
  "PRODUCT_INFORMATION",
  "BROKEN_PRODUCT_LINK",
  "SIZE_AND_FIT",
  "WEBSITE_FUNCTIONALITY",
  "WISHLIST_OR_ACCOUNT",
  "SHIPPING_AND_RETURNS",
  "OTHER",
] as const;

export type FeedbackIssueCategory =
  (typeof FEEDBACK_ISSUE_CATEGORIES)[number];

export type FeedbackInput =
  | {
      type: "ISSUE";
      category: FeedbackIssueCategory;
      message: string;
      contactEmail: string | null;
      contactName: string | null;
      productId: string | null;
      pageUrl: string | null;
    }
  | {
      type: "IDEA";
      category: null;
      message: string;
      contactEmail: string | null;
      contactName: string | null;
      productId: string | null;
      pageUrl: string | null;
    };

export type FeedbackInputResult =
  | {
      ok: true;
      value: FeedbackInput;
    }
  | {
      ok: false;
      error: string;
    };

function optionalString(
  value: unknown,
  maxLength: number
): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Invalid field type.");
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    throw new Error("Field exceeds maximum length.");
  }

  return normalized || null;
}

export function parseFeedbackInput(
  raw: unknown
): FeedbackInputResult {
  if (
    !raw ||
    typeof raw !== "object" ||
    Array.isArray(raw)
  ) {
    return {
      ok: false,
      error: "Invalid feedback submission.",
    };
  }

  const input = raw as Record<string, unknown>;

  if (input.type !== "ISSUE" && input.type !== "IDEA") {
    return {
      ok: false,
      error: "Please select a feedback type.",
    };
  }

  try {
    const message = optionalString(input.message, 3000);

    if (!message || message.length < 20) {
      return {
        ok: false,
        error: "Please enter at least 20 characters.",
      };
    }

    const contactEmail = optionalString(
      input.contactEmail,
      254
    );

    if (
      contactEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
    ) {
      return {
        ok: false,
        error: "Please enter a valid email address.",
      };
    }

    const contactName = optionalString(
      input.contactName,
      100
    );

    const productId = optionalString(
      input.productId,
      36
    );

    if (
      productId &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        productId
      )
    ) {
      return {
        ok: false,
        error: "Invalid product reference.",
      };
    }

    const pageUrl = optionalString(
      input.pageUrl,
      2000
    );

    if (pageUrl) {
      try {
        const url = new URL(pageUrl);

        if (
          url.protocol !== "https:" &&
          url.protocol !== "http:"
        ) {
          throw new Error("Invalid URL protocol.");
        }
      } catch {
        return {
          ok: false,
          error: "Invalid page URL.",
        };
      }
    }

    if (input.type === "ISSUE") {
      if (
        !FEEDBACK_ISSUE_CATEGORIES.includes(
          input.category as FeedbackIssueCategory
        )
      ) {
        return {
          ok: false,
          error: "Please select an issue category.",
        };
      }

      return {
        ok: true,
        value: {
          type: "ISSUE",
          category: input.category as FeedbackIssueCategory,
          message,
          contactEmail,
          contactName,
          productId,
          pageUrl,
        },
      };
    }

    return {
      ok: true,
      value: {
        type: "IDEA",
        category: null,
        message,
        contactEmail,
        contactName,
        productId,
        pageUrl,
      },
    };
  } catch {
    return {
      ok: false,
      error: "One or more feedback fields are invalid.",
    };
  }
}