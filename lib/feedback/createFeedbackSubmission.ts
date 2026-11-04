import "server-only";

import { prisma } from "@/lib/prisma";
import { createFeedbackFingerprint } from "@/lib/feedback/feedbackDuplicate";

const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const SUBMISSION_WINDOW_MS = 60 * 60 * 1000;

const SHOPPER_SUBMISSION_LIMIT = 5;
const GUEST_SUBMISSION_LIMIT = 3;

type CreateFeedbackInput = {
  type: "ISSUE" | "IDEA";
  category: string | null;
  message: string;

  shopperId: string | null;
  guestIpHash: string | null;

  contactEmail: string | null;
  contactName: string | null;
  emailVerifiedBySession: boolean;

  productId: string | null;
  productTitleSnapshot: string | null;
  brandNameSnapshot: string | null;
  productUrlSnapshot: string | null;
  pageUrl: string | null;
};

type CreateFeedbackResult =
  | {
      status: "CREATED";
      id: string;
      duplicate: false;
    }
  | {
      status: "DUPLICATE";
      id: string;
      duplicate: true;
    }
  | {
      status: "RATE_LIMITED";
      retryAt: Date;
    };

export async function createFeedbackSubmission(
  input: CreateFeedbackInput
): Promise<CreateFeedbackResult> {
  if (!input.shopperId && !input.guestIpHash) {
    throw new Error("Feedback submission requires a verified identity key.");
  }

  const fingerprint = createFeedbackFingerprint({
    type: input.type,
    category: input.category,
    message: input.message,
    productId: input.productId,
  });

  const identity = input.shopperId
    ? `shopper:${input.shopperId}`
    : `guest:${input.guestIpHash}`;

  const dedupeKey = `${identity}:${fingerprint}`;

  return prisma.$transaction(async (tx) => {
    // Serialize all feedback submissions for the same identity.
// This protects both duplicate detection and submission limits.
const submissionRateKey = input.shopperId
  ? `feedback:submission:shopper:${input.shopperId}`
  : `feedback:submission:guest:${input.guestIpHash}`;

await tx.$queryRaw`
  SELECT pg_advisory_xact_lock(
    hashtextextended(${submissionRateKey}, 0)
  )::text
`;

    const now = new Date();

    const existing = await tx.feedbackSubmission.findUnique({
      where: { dedupeKey },
      select: {
        id: true,
        dedupeExpiresAt: true,
      },
    });

    if (
      existing &&
      existing.dedupeExpiresAt &&
      existing.dedupeExpiresAt > now
    ) {
      await tx.feedbackSubmission.update({
        where: { id: existing.id },
        data: {
          duplicateCount: {
            increment: 1,
          },
        },
      });

return {
  status: "DUPLICATE" as const,
  id: existing.id,
  duplicate: true as const,
};
    }

    // Only genuinely new feedback counts towards the submission limit.
// This runs after duplicate detection but before creating a record.

const submissionLimit = input.shopperId
  ? SHOPPER_SUBMISSION_LIMIT
  : GUEST_SUBMISSION_LIMIT;

const submissionResetAt = new Date(
  now.getTime() + SUBMISSION_WINDOW_MS
);

const currentLimit = await tx.rateLimit.findUnique({
  where: { key: submissionRateKey },
  select: {
    count: true,
    resetAt: true,
  },
});

if (
  currentLimit &&
  currentLimit.resetAt > now &&
  currentLimit.count >= submissionLimit
) {
  return {
    status: "RATE_LIMITED" as const,
    retryAt: currentLimit.resetAt,
  };
}

if (!currentLimit) {
  await tx.rateLimit.create({
    data: {
      key: submissionRateKey,
      count: 1,
      resetAt: submissionResetAt,
    },
  });
} else if (currentLimit.resetAt <= now) {
  await tx.rateLimit.update({
    where: { key: submissionRateKey },
    data: {
      count: 1,
      resetAt: submissionResetAt,
    },
  });
} else {
  await tx.rateLimit.update({
    where: { key: submissionRateKey },
    data: {
      count: { increment: 1 },
    },
  });
}

    // An expired key must be released before it can be reused.
    // Keep the historical submission intact.
    if (existing) {
      await tx.feedbackSubmission.update({
        where: { id: existing.id },
        data: {
          dedupeKey: null,
          dedupeExpiresAt: null,
        },
      });
    }

    const expiresAt = new Date(
      now.getTime() + DEDUPE_WINDOW_MS
    );

    const feedback = await tx.feedbackSubmission.create({
      data: {
        type: input.type,
        category: input.category,
        message: input.message,
        status: "NEW",

        shopperId: input.shopperId,
        contactEmail: input.contactEmail,
        contactName: input.contactName,
        emailVerifiedBySession: input.emailVerifiedBySession,

        productId: input.productId,
        productTitleSnapshot: input.productTitleSnapshot,
        brandNameSnapshot: input.brandNameSnapshot,
        productUrlSnapshot: input.productUrlSnapshot,
        pageUrl: input.pageUrl,

        dedupeKey,
        dedupeExpiresAt: expiresAt,
        duplicateCount: 0,

        adminEmailStatus: "PENDING",
        // Shopper acknowledgements require verified email ownership.
// Authentication alone does not establish verification.
//
// Until shopper email verification is implemented,
// no new feedback submission qualifies for an
// automatic acknowledgement.
shopperEmailStatus: "NOT_APPLICABLE",
      },
      select: {
        id: true,
      },
    });

return {
  status: "CREATED" as const,
  id: feedback.id,
  duplicate: false as const,
};
  });
}