export type FeedbackPageUrlResult =
  | {
      ok: true;
      pageUrl: string | null;
    }
  | {
      ok: false;
      error: string;
    };

export function validateFeedbackPageUrl(
  submittedUrl: string | null,
  trustedOrigin: string
): FeedbackPageUrlResult {
  if (!submittedUrl) {
    return {
      ok: true,
      pageUrl: null,
    };
  }

  try {
    const submitted = new URL(submittedUrl);
    const trusted = new URL(trustedOrigin);

    if (
      submitted.protocol !== "https:" &&
      submitted.protocol !== "http:"
    ) {
      return {
        ok: false,
        error: "Invalid page URL.",
      };
    }

    if (submitted.origin !== trusted.origin) {
      return {
        ok: false,
        error: "Page URL must belong to Veilora Club.",
      };
    }

    if (submitted.username || submitted.password) {
      return {
        ok: false,
        error: "Invalid page URL.",
      };
    }

    // Preserve the page location without retaining
// sensitive query parameters or browser fragments.
submitted.search = "";
submitted.hash = "";

    return {
      ok: true,
      pageUrl: submitted.toString(),
    };
  } catch {
    return {
      ok: false,
      error: "Invalid page URL.",
    };
  }
}