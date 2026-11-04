import "server-only";

export type FeedbackEmailType = "ISSUE" | "IDEA";

export type FeedbackEmailConfig = {
  from: string;
  adminTo: string;
  label: string;
};

export function getFeedbackEmailConfig(
  type: FeedbackEmailType
): FeedbackEmailConfig {
  if (type === "ISSUE") {
    const from = process.env.FEEDBACK_REPORT_FROM_EMAIL;
    const adminTo = process.env.FEEDBACK_REPORT_TO_EMAIL;

    if (!from || !adminTo) {
      throw new Error(
        "Report feedback email configuration is missing."
      );
    }

    return {
      from,
      adminTo,
      label: "Report an Issue",
    };
  }

  const from = process.env.FEEDBACK_IDEA_FROM_EMAIL;
  const adminTo = process.env.FEEDBACK_IDEA_TO_EMAIL;

  if (!from || !adminTo) {
    throw new Error(
      "Idea feedback email configuration is missing."
    );
  }

  return {
    from,
    adminTo,
    label: "Share an Idea",
  };
}