import "server-only";

import type { PrismaClient } from "@prisma/client";

import { claimNewsletterWelcomeEvent } from "./claimNewsletterWelcomeEvent";
import { validateClaimedNewsletterWelcomeEvent } from "./validateClaimedNewsletterWelcomeEvent";
import { prepareNewsletterWelcomeSubmission } from "./transitionNewsletterWelcomeEvent";
import { completeNewsletterWelcomeEvent } from "./completeNewsletterWelcomeEvent";
import { checkNewsletterWelcomeConsentBeforeSend } from "./checkNewsletterWelcomeConsentBeforeSend";

import { sendNewsletterWelcomeEmail } from "@/lib/resend/templates/marketing/newsletterWelcome";

export type NewsletterWelcomeWorkerResult =
  | { status: "EMPTY" }
  | { status: "READY_NOT_SUBMITTED" }
  | { status: "CANCELLED" }
  | { status: "SENT" }
  | { status: "UNKNOWN" }
  | { status: "CONFLICT" };

type WorkerOptions = {
  enableProviderSubmission?: boolean;
};

export async function processOneNewsletterWelcomeEvent(
  db: PrismaClient,
  options: WorkerOptions = {}
): Promise<NewsletterWelcomeWorkerResult> {
  // Disabled workers must not claim or mutate outbox events.
  if (options.enableProviderSubmission !== true) {
    return { status: "READY_NOT_SUBMITTED" };
  }

  const claimed = await claimNewsletterWelcomeEvent(db);

  if (!claimed) {
    return { status: "EMPTY" };
  }

  const validation = await validateClaimedNewsletterWelcomeEvent(
    db,
    claimed.id,
    claimed.claimToken
  );

  if (validation.status === "INVALID_CLAIM") {
    return { status: "CONFLICT" };
  }

  if (validation.status === "BLOCKED") {
    const cancelled = await db.newsletterWelcomeEvent.updateMany({
      where: {
        id: claimed.id,
        status: "PROCESSING",
        claimToken: claimed.claimToken,
      },
      data: {
        status: "CANCELLED",
        claimToken: null,
        claimedAt: null,
        nextAttemptAt: null,
      },
    });

    return cancelled.count === 1
      ? { status: "CANCELLED" }
      : { status: "CONFLICT" };
  }

  const prepared = await prepareNewsletterWelcomeSubmission(
    db,
    claimed.id,
    claimed.claimToken
  );

  if (prepared.status === "CANCELLED") {
    return { status: "CANCELLED" };
  }

  if (prepared.status !== "READY") {
    return { status: "CONFLICT" };
  }

  // Final read-only consent check immediately before provider submission.
  // A failed check must never result in an automatic resend.
  let finalConsent: Awaited<
    ReturnType<typeof checkNewsletterWelcomeConsentBeforeSend>
  >;

  try {
    finalConsent = await checkNewsletterWelcomeConsentBeforeSend(
      db,
      claimed.id,
      claimed.claimToken,
      prepared.email,
      prepared.unsubscribeToken
    );
  } catch {
    // Database outcome is uncertain. Leave SUBMITTING for reconciliation.
    return { status: "UNKNOWN" };
  }

  if (finalConsent.status === "CONFLICT") {
    return { status: "CONFLICT" };
  }

  if (finalConsent.status === "BLOCKED") {
    const cancelled = await db.newsletterWelcomeEvent.updateMany({
      where: {
        id: claimed.id,
        status: "SUBMITTING",
        claimToken: claimed.claimToken,
      },
      data: {
        status: "CANCELLED",
        claimToken: null,
        claimedAt: null,
        nextAttemptAt: null,
      },
    });

    return cancelled.count === 1
      ? { status: "CANCELLED" }
      : { status: "CONFLICT" };
  }

  let providerMessageId: string;

  try {
    const result = await sendNewsletterWelcomeEmail({
      to: prepared.email,
      unsubscribeToken: prepared.unsubscribeToken,
      idempotencyKey: prepared.eventKey,
    });

    providerMessageId = result.id;
  } catch {
    // Provider acceptance is uncertain. Never automatically resend.
    const completed = await completeNewsletterWelcomeEvent(
      db,
      claimed.id,
      claimed.claimToken,
      {
        status: "UNKNOWN",
        reason: "Provider submission failed or outcome uncertain.",
      }
    );

    return completed
      ? { status: "UNKNOWN" }
      : { status: "CONFLICT" };
  }

  // Provider acceptance was confirmed. A database failure here
  // must not trigger another provider request or overwrite the
  // event as a provider failure.
  const completed = await completeNewsletterWelcomeEvent(
    db,
    claimed.id,
    claimed.claimToken,
    {
      status: "SENT",
      providerMessageId,
    }
  );

  return completed
    ? { status: "SENT" }
    : { status: "UNKNOWN" };
}