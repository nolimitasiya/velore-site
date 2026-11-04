export type FeedbackSubmissionPayload = {
  type: "ISSUE" | "IDEA";
  category: string | null;
  message: string;
  contactEmail: string | null;
  contactName: string | null;
  productId: string | null;
  pageUrl: string | null;
};

export type FeedbackSubmissionResult =
  | {
      ok: true;
      feedbackId: string;
      duplicate: boolean;
      message: string;
    }
  | {
      ok: false;
      error: string;
      status: number | null;
    };

export async function submitFeedback(
  payload: FeedbackSubmissionPayload
): Promise<FeedbackSubmissionResult> {
  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify(payload),
    });

    const data: unknown = await response.json();

    if (!data || typeof data !== "object") {
      return {
        ok: false,
        error: "An unexpected response was received. Please try again.",
        status: response.status,
      };
    }

    const result = data as Record<string, unknown>;

    if (!response.ok) {
      return {
        ok: false,
        error:
          typeof result.error === "string"
            ? result.error
            : "Unable to submit feedback. Please try again.",
        status: response.status,
      };
    }

    if (
      result.ok !== true ||
      typeof result.feedbackId !== "string" ||
      typeof result.duplicate !== "boolean" ||
      typeof result.message !== "string"
    ) {
      return {
        ok: false,
        error: "An unexpected response was received. Please try again.",
        status: response.status,
      };
    }

    return {
      ok: true,
      feedbackId: result.feedbackId,
      duplicate: result.duplicate,
      message: result.message,
    };
  } catch {
    return {
      ok: false,
      error:
        "We couldn't connect to Veilora Club. Please check your connection and try again.",
      status: null,
    };
  }
}