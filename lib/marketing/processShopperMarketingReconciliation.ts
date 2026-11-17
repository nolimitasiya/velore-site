import "server-only";

import type { PrismaClient } from "@prisma/client";

import {
  readShopperMarketingConsentFromKlaviyo,
  readShopperListMembershipFromKlaviyo,
} from "../klaviyo/readShopperMarketingConsent";

import {
  transitionShopperMarketingReconciliation,
} from "./transitionShopperMarketingReconciliation";

import {
  decideShopperListRemovalReconciliation,
} from "./decideShopperListRemovalReconciliation";

type ReconciliationResult =
  | { status: "NOT_FOUND" }
  | { status: "NOT_ELIGIBLE" }
  | { status: "UNRESOLVED"; reason: string }
  | { status: "TRANSITION_CONFLICT" };

export async function processShopperMarketingReconciliation(
  db: PrismaClient,
  operationId: string
): Promise<ReconciliationResult> {
  if (!operationId.trim()) {
    throw new Error("Missing marketing reconciliation operation ID");
  }

  const operation =
    await db.shopperMarketingConsentSync.findUnique({
      where: { id: operationId },
      select: {
        id: true,
        shopperId: true,
        email: true,
        consentVersion: true,
        desiredConsent: true,
        status: true,
        providerJobId: true,
        providerOperationType: true,
        submittedAt: true,
      },
    });

  if (!operation) {
    return { status: "NOT_FOUND" };
  }

  if (
    operation.status !== "SUBMITTED" &&
    operation.status !== "UNKNOWN"
  ) {
    return { status: "NOT_ELIGIBLE" };
  }

  const shopper = await db.shopper.findUnique({
    where: { id: operation.shopperId },
    select: {
      email: true,
      marketingConsent: true,
      marketingConsentVersion: true,
    },
  });

  if (!shopper) {
    return {
      status: "UNRESOLVED",
      reason: "SHOPPER_NOT_FOUND",
    };
  }

  const operationEmail = operation.email.trim().toLowerCase();
  const currentEmail = shopper.email.trim().toLowerCase();

  if (
    operationEmail !== currentEmail ||
    operation.consentVersion !== shopper.marketingConsentVersion ||
    operation.desiredConsent !== shopper.marketingConsent
  ) {
    const transition =
      await transitionShopperMarketingReconciliation(
        db,
        operation.id,
        {
          decision: "UNKNOWN",
          reason: "Shopper consent or email has changed.",
        }
      );

    return transition.outcome === "UPDATED"
      ? {
          status: "UNRESOLVED",
          reason: "STALE_OPERATION",
        }
      : { status: "TRANSITION_CONFLICT" };
  }

  if (operation.providerOperationType === "REMOVE_FROM_SHOPPER_LIST") {
    let membership: "MEMBER" | "NOT_MEMBER" | "UNKNOWN" = "UNKNOWN";
    let newsletterPreserved = false;

    try {
      const providerProfile =
        await readShopperMarketingConsentFromKlaviyo(operation.email);

      if (providerProfile.profileId) {
        membership =
          await readShopperListMembershipFromKlaviyo(
            providerProfile.profileId
          );
      }
    } catch {
      membership = "UNKNOWN";
    }

    try {
      const confirmedNewsletterCount =
        await db.newsletterSubscriber.count({
          where: {
            email: {
              equals: operation.email,
              mode: "insensitive",
            },
            status: "confirmed",
          },
        });

      newsletterPreserved = confirmedNewsletterCount > 0;
    } catch {
      newsletterPreserved = false;
    }

    // No verified promotional-flow suppression mechanism exists yet.
    // Never infer suppression solely from list removal.
    const decision = decideShopperListRemovalReconciliation({
      membership,
      independentNewsletterConsentPreserved: newsletterPreserved,
      promotionalFlowSuppressionVerified: false,
    });

    const transitioned =
      await transitionShopperMarketingReconciliation(
        db,
        operation.id,
        {
          decision: "UNKNOWN",
          reason: decision.status === "UNKNOWN"
            ? decision.reason
            : "Promotional-flow suppression remains unverified.",
        }
      );

    return transitioned.outcome === "UPDATED"
      ? {
          status: "UNRESOLVED",
          reason: "SHOPPER_LIST_REMOVAL_RECONCILIATION_REQUIRED",
        }
      : { status: "TRANSITION_CONFLICT" };
  }
  // Missing job IDs must not prevent read-only provider verification.
  // Provider state alone cannot establish completion of this operation.
  const missingProviderJobId = !operation.providerJobId?.trim();

  let providerConsent;

  try {
    providerConsent =
      await readShopperMarketingConsentFromKlaviyo(
        operation.email
      );
  } catch {
    const transition =
      await transitionShopperMarketingReconciliation(
        db,
        operation.id,
        {
          decision: "UNKNOWN",
          reason: "Klaviyo consent lookup unavailable.",
        }
      );

    return transition.outcome === "UPDATED"
      ? {
          status: "UNRESOLVED",
          reason: "PROVIDER_LOOKUP_UNAVAILABLE",
        }
      : { status: "TRANSITION_CONFLICT" };
  }

  // Membership supports subscription verification but cannot prove
  // completion of a specific Klaviyo bulk subscription job.
  if (operation.desiredConsent && providerConsent.state === "SUBSCRIBED") {
    let membership: "MEMBER" | "NOT_MEMBER" | "UNKNOWN";

    try {
      membership = providerConsent.profileId
        ? await readShopperListMembershipFromKlaviyo(providerConsent.profileId)
        : "UNKNOWN";
    } catch {
      membership = "UNKNOWN";
    }

    if (membership !== "MEMBER") {
      const reason =
        membership === "NOT_MEMBER"
          ? "Shopper profile is not in the dedicated Klaviyo shopper list."
          : "Klaviyo shopper-list membership could not be verified.";

      const transitioned = await transitionShopperMarketingReconciliation(
        db,
        operationId,
        {
          decision: "UNKNOWN",
          reason,
        }
      );

      if (transitioned.outcome !== "UPDATED") {
        return {
          status: "TRANSITION_CONFLICT",
        };
      }

      return {
        status: "UNRESOLVED",
        reason:
          membership === "NOT_MEMBER"
            ? "SHOPPER_LIST_MEMBERSHIP_MISSING"
            : "SHOPPER_LIST_MEMBERSHIP_UNVERIFIED",
      };
    }
  }
  // A missing provider job ID remains unresolved even if the
  // current Klaviyo subscription state matches the requested consent.
  // Reconciliation must never infer causal completion from state alone.
  const consentMatches = operation.desiredConsent
    ? providerConsent.state === "SUBSCRIBED"
    : providerConsent.state === "UNSUBSCRIBED" ||
      providerConsent.state === "NEVER_SUBSCRIBED";

  const providerTimestamp = providerConsent.consentTimestamp
    ? Date.parse(providerConsent.consentTimestamp)
    : NaN;

  const submissionTimestamp = operation.submittedAt
    ? new Date(operation.submittedAt).getTime()
    : NaN;

  const timestampMissingOrInvalid =
    !Number.isFinite(providerTimestamp) ||
    !Number.isFinite(submissionTimestamp);

  const timestampPredatesSubmission =
    !timestampMissingOrInvalid &&
    providerTimestamp < submissionTimestamp;

  const transition =
    await transitionShopperMarketingReconciliation(
      db,
      operation.id,
      {
        decision: "UNKNOWN",
        reason: missingProviderJobId
          ? "MISSING_PROVIDER_JOB_ID"
          : !consentMatches
          ? "Provider consent does not establish successful job completion."
          : timestampMissingOrInvalid
            ? "Provider or submission timestamp missing or invalid."
            : timestampPredatesSubmission
              ? "Provider consent predates this submission."
              : "Provider consent matches, but job completion is unverified.",
      }
    );

  return transition.outcome === "UPDATED"
    ? {
        status: "UNRESOLVED",
        reason: missingProviderJobId
          ? "MISSING_PROVIDER_JOB_ID"
          : !consentMatches
          ? "PROVIDER_CONSENT_UNVERIFIED"
          : timestampMissingOrInvalid
            ? "TIMESTAMP_UNVERIFIED"
            : timestampPredatesSubmission
              ? "PROVIDER_CONSENT_PREDATES_SUBMISSION"
              : "JOB_COMPLETION_UNVERIFIED",
      }
    : { status: "TRANSITION_CONFLICT" };
}
