import "server-only";

import { prisma } from "@/lib/prisma";

import {
  claimFeedbackEmail,
  type FeedbackEmailRecipient,
} from "@/lib/feedback/claimFeedbackEmail";

import {
  completeFeedbackEmail,
} from "@/lib/feedback/completeFeedbackEmail";

import {
  getFeedbackEmailConfig,
} from "@/lib/feedback/feedbackEmailConfig";

import {
  feedbackAdminEmail,
  feedbackShopperEmail,
} from "@/lib/feedback/feedbackEmailTemplates";

import {
  sendFeedbackEmail,
} from "@/lib/feedback/sendFeedbackEmail";

export type ProcessFeedbackEmailResult =
  | "SENT"
  | "FAILED"
  | "SKIPPED"
  | "STALE";

export async function processFeedbackEmail(
  feedbackId: string,
  recipient: FeedbackEmailRecipient
): Promise<ProcessFeedbackEmailResult> {
  // Only one worker can claim an eligible delivery.
  const claim = await claimFeedbackEmail(
    feedbackId,
    recipient
  );

  if (!claim) {
    return "SKIPPED";
  }

  try {
    const feedback =
      await prisma.feedbackSubmission.findUnique({
        where: {
          id: feedbackId,
        },
        select: {
          id: true,
          type: true,
          category: true,
          message: true,
          contactName: true,
          contactEmail: true,
          pageUrl: true,
          productTitleSnapshot: true,
          brandNameSnapshot: true,
        },
      });

    if (!feedback) {
      throw new Error(
        "Feedback submission not found."
      );
    }

    const config = getFeedbackEmailConfig(
      feedback.type
    );

    const templateInput = {
      type: feedback.type,
      id: feedback.id,
      category: feedback.category,
      message: feedback.message,
      contactName: feedback.contactName,
      contactEmail: feedback.contactEmail,
      pageUrl: feedback.pageUrl,
      productTitle: feedback.productTitleSnapshot,
      brandName: feedback.brandNameSnapshot,
    };

    const template =
      recipient === "ADMIN"
        ? feedbackAdminEmail(templateInput)
        : feedbackShopperEmail(templateInput);

    const to =
      recipient === "ADMIN"
        ? config.adminTo
        : feedback.contactEmail;

    if (
  !to ||
  to.length > 254 ||
  !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)
) {
  throw new Error(
    "Feedback email recipient is missing or invalid."
  );
}

    const idempotencyKey =
      recipient === "ADMIN"
        ? `feedback-admin-${feedback.id}`
        : `feedback-shopper-${feedback.id}`;

    await sendFeedbackEmail({
      from: config.from,
      to,
      subject: template.subject,
      html: template.html,
      idempotencyKey,
    });

  } catch (error) {
    // Keep the submission saved even if email delivery fails.
    console.error(
   "[feedback-email] Delivery failed",
   {
    feedbackId,
    recipient,
    errorType:
      error instanceof Error
        ? error.name
        : "UnknownError",
  }
);

    const completed = await completeFeedbackEmail(
      claim,
      { status: "FAILED" }
    );

    return completed ? "FAILED" : "STALE";
  }

  // Resend has confirmed acceptance of the email.
  //
  // If recording SENT fails, do not mark the email FAILED.
  // Leave the claim PROCESSING so the existing lease
  // mechanism can handle a subsequent retry.
  const completed = await completeFeedbackEmail(
    claim,
    { status: "SENT" }
  );

  return completed ? "SENT" : "STALE";
}