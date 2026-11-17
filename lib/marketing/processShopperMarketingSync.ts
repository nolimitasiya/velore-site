import "server-only";

import type { PrismaClient } from "@prisma/client";

import {
  claimShopperMarketingSync,
} from "./claimShopperMarketingSync";

import {
  validateClaimedShopperMarketingSync,
} from "./validateClaimedShopperMarketingSync";

import {
  classifyShopperMarketingProviderOperation,
  transitionShopperMarketingSync,
} from "./transitionShopperMarketingSync";

import {
  releaseShopperMarketingSyncClaim,
} from "./releaseShopperMarketingSyncClaim";

import {
  checkShopperMarketingProviderOrdering,
} from "./checkShopperMarketingProviderOrdering";

import {
  submitShopperMarketingConsentToKlaviyo,
} from "../klaviyo/shopperMarketingConsent";

import {
  removeShopperFromKlaviyoList,
} from "../klaviyo/removeShopperFromList";

import {
  readShopperMarketingConsentFromKlaviyo,
  readShopperListMembershipFromKlaviyo,
} from "../klaviyo/readShopperMarketingConsent";

export type MarketingSyncWorkerResult =
  | { status: "EMPTY" }
  | { status: "READY_NOT_SUBMITTED" }
  | { status: "SUBMITTED"; providerJobId: string }
  | { status: "SUPERSEDED" }
  | { status: "BLOCKED"; reason: string }
  | { status: "INVALID_CLAIM"; reason: string }
  | { status: "TRANSITION_CONFLICT" }
  | { status: "UNKNOWN"; reason: string };

type WorkerOptions = {
  enableProviderSubmission?: boolean;
  allowedEmail?: string;
};

export async function processOneShopperMarketingSync(
  db: PrismaClient,
  options: WorkerOptions = {}
): Promise<MarketingSyncWorkerResult> {
  const claimed = await claimShopperMarketingSync(db, options.allowedEmail);

  if (!claimed) {
    return { status: "EMPTY" };
  }

  const validation =
    await validateClaimedShopperMarketingSync(
      db,
      claimed.id,
      claimed.claimToken
    );

  if (validation.status === "INVALID_CLAIM") {
    return {
      status: "INVALID_CLAIM",
      reason: validation.reason,
    };
  }

  if (validation.status === "SUPERSEDED") {
    const transitioned =
      await transitionShopperMarketingSync(
        db,
        claimed.id,
        claimed.claimToken,
        { status: "SUPERSEDED" }
      );

    return transitioned
      ? { status: "SUPERSEDED" }
      : { status: "TRANSITION_CONFLICT" };
  }

  if (validation.status === "BLOCKED") {
    const transitioned =
      await transitionShopperMarketingSync(
        db,
        claimed.id,
        claimed.claimToken,
        {
          status: "UNKNOWN",
          error: `Manual review required: ${validation.reason}`,
        }
      );

    return transitioned
      ? {
          status: "BLOCKED",
          reason: validation.reason,
        }
      : { status: "TRANSITION_CONFLICT" };
  }

  // The first live integration must not submit historical
  // old-address unsubscribe operations. Those require
  // additional newsletter/waitlist ownership checks.
  if (claimed.reason === "EMAIL_CHANGE_OLD_ADDRESS") {
    const transitioned =
      await transitionShopperMarketingSync(
        db,
        claimed.id,
        claimed.claimToken,
        {
          status: "UNKNOWN",
          error:
            "Old-address unsubscribe requires ownership review.",
        }
      );

    return transitioned
      ? {
          status: "BLOCKED",
          reason: "OLD_ADDRESS_OWNERSHIP_REVIEW",
        }
      : { status: "TRANSITION_CONFLICT" };
  }

  const ordering =
    await checkShopperMarketingProviderOrdering(
      db,
      {
        id: claimed.id,
        shopperId: claimed.shopperId,
        email: claimed.email,
      }
    );

  if (ordering.status === "BLOCKED") {
    const transitioned =
      await transitionShopperMarketingSync(
        db,
        claimed.id,
        claimed.claimToken,
        {
          status: "UNKNOWN",
          error: `Provider ordering blocked: ${ordering.reason}`,
        }
      );

    return transitioned
      ? {
          status: "BLOCKED",
          reason: ordering.reason,
        }
      : { status: "TRANSITION_CONFLICT" };
  }

  if (options.enableProviderSubmission !== true) {
    const released =
      await releaseShopperMarketingSyncClaim(
        db,
        claimed.id,
        claimed.claimToken
      );

    return released
      ? { status: "READY_NOT_SUBMITTED" }
      : { status: "TRANSITION_CONFLICT" };
  }

  // DEVELOPMENT ONLY:
  // No production route or cron should invoke this with
  // enableProviderSubmission=true until provider ordering,
  // job reconciliation and shared-email safeguards pass.
  if (!claimed.desiredConsent) {
    // Klaviyo bulk unsubscribe can globally suppress an email.
    // Preserve independently confirmed newsletter consent.
    let confirmedNewsletterCount: number;

    try {
      confirmedNewsletterCount =
        await db.newsletterSubscriber.count({
          where: {
            email: {
              equals: claimed.email,
              mode: "insensitive",
            },
            status: "confirmed",
          },
        });
    } catch {
      const transitioned =
        await transitionShopperMarketingSync(
          db,
          claimed.id,
          claimed.claimToken,
          {
            status: "UNKNOWN",
            error:
              "Newsletter ownership lookup failed before provider submission.",
          }
        );

      return transitioned
        ? {
            status: "BLOCKED",
            reason: "NEWSLETTER_OWNERSHIP_LOOKUP_FAILED",
          }
        : { status: "TRANSITION_CONFLICT" };
    }

    if (confirmedNewsletterCount > 0) {
      // Preserve independently confirmed newsletter consent.
      // Remove only shopper-list membership; never globally unsubscribe.
      let profileId: string | null = null;
      let membership: string = "UNKNOWN";

      try {
        const providerProfile =
          await readShopperMarketingConsentFromKlaviyo(
            claimed.email
          );

        if (
          providerProfile.profileId &&
          providerProfile.state !== "UNKNOWN"
        ) {
          profileId = providerProfile.profileId;
          membership =
            await readShopperListMembershipFromKlaviyo(
              profileId
            );
        }
      } catch {
        membership = "UNKNOWN";
      }

      if (!profileId || membership !== "MEMBER") {
        const transitioned =
          await transitionShopperMarketingSync(
            db,
            claimed.id,
            claimed.claimToken,
            {
              status: "UNKNOWN",
              error:
                "Shopper-list removal blocked: provider membership could not be verified.",
            }
          );

        return transitioned
          ? {
              status: "BLOCKED",
              reason: "SHOPPER_LIST_MEMBERSHIP_UNVERIFIED",
            }
          : { status: "TRANSITION_CONFLICT" };
      }

      try {
        const classified =
          await classifyShopperMarketingProviderOperation(
            db,
            claimed.id,
            claimed.claimToken,
            "REMOVE_FROM_SHOPPER_LIST"
          );

        if (!classified) {
          return { status: "TRANSITION_CONFLICT" };
        }

        await removeShopperFromKlaviyoList({ profileId });

        // HTTP success establishes request acceptance only.
        // Reconciliation must verify subsequent list membership
        // and promotional-flow suppression.
        const transitioned =
          await transitionShopperMarketingSync(
            db,
            claimed.id,
            claimed.claimToken,
            {
              status: "UNKNOWN",
              error:
                "Shopper-list removal accepted; membership and promotional-flow reconciliation required.",
            }
          );

        return transitioned
          ? {
              status: "UNKNOWN",
              reason: "SHOPPER_LIST_REMOVAL_RECONCILIATION_REQUIRED",
            }
          : {
              status: "UNKNOWN",
              reason: "PROVIDER_ACCEPTED_DATABASE_TRANSITION_FAILED",
            };
      } catch {
        // Never blindly retry an uncertain provider outcome.
        const transitioned =
          await transitionShopperMarketingSync(
            db,
            claimed.id,
            claimed.claimToken,
            {
              status: "UNKNOWN",
              error:
                "Shopper-list removal failed or provider outcome is uncertain.",
            }
          );

        return transitioned
          ? {
              status: "UNKNOWN",
              reason: "PROVIDER_OUTCOME_UNCERTAIN",
            }
          : { status: "TRANSITION_CONFLICT" };
      }
    }

    let membershipVerified = false;

    try {
      const providerProfile =
        await readShopperMarketingConsentFromKlaviyo(
          claimed.email
        );

      if (
        providerProfile.profileId &&
        providerProfile.state !== "UNKNOWN"
      ) {
        const membership =
          await readShopperListMembershipFromKlaviyo(
            providerProfile.profileId
          );

        membershipVerified = membership === "MEMBER";
      }
    } catch {
      membershipVerified = false;
    }

    if (!membershipVerified) {
      const transitioned =
        await transitionShopperMarketingSync(
          db,
          claimed.id,
          claimed.claimToken,
          {
            status: "UNKNOWN",
            error:
              "Provider unsubscribe blocked before submission: shopper-list membership could not be verified.",
          }
        );

      return transitioned
        ? {
            status: "BLOCKED",
            reason: "SHOPPER_LIST_MEMBERSHIP_UNVERIFIED",
          }
        : { status: "TRANSITION_CONFLICT" };
    }
  }

  if (!claimed.desiredConsent) {
    const classified =
      await classifyShopperMarketingProviderOperation(
        db,
        claimed.id,
        claimed.claimToken,
        "UNSUBSCRIBE"
      );

    if (!classified) {
      return { status: "TRANSITION_CONFLICT" };
    }
  }

  // Revalidate current consent immediately before provider submission.
  const finalValidation =
    await validateClaimedShopperMarketingSync(
      db,
      claimed.id,
      claimed.claimToken
    );

  if (finalValidation.status === "SUPERSEDED") {
    const transitioned =
      await transitionShopperMarketingSync(
        db,
        claimed.id,
        claimed.claimToken,
        { status: "SUPERSEDED" }
      );

    return transitioned
      ? { status: "SUPERSEDED" }
      : { status: "TRANSITION_CONFLICT" };
  }

  if (finalValidation.status === "BLOCKED") {
    const transitioned =
      await transitionShopperMarketingSync(
        db,
        claimed.id,
        claimed.claimToken,
        {
          status: "UNKNOWN",
          error: `Final validation blocked: ${finalValidation.reason}`,
        }
      );

    return transitioned
      ? {
          status: "BLOCKED",
          reason: finalValidation.reason,
        }
      : { status: "TRANSITION_CONFLICT" };
  }

  if (finalValidation.status !== "READY") {
    const released =
      await releaseShopperMarketingSyncClaim(
        db,
        claimed.id,
        claimed.claimToken
      );

    return released
      ? {
          status: "INVALID_CLAIM",
          reason: finalValidation.reason,
        }
      : { status: "TRANSITION_CONFLICT" };
  }

  try {
    const submission =
      await submitShopperMarketingConsentToKlaviyo({
        email: claimed.email,
        action: claimed.desiredConsent
          ? "SUBSCRIBE"
          : "UNSUBSCRIBE",
      });
    if (submission.status === "ACCEPTED_WITHOUT_JOB_ID") {
      const transitioned =
        await transitionShopperMarketingSync(
          db,
          claimed.id,
          claimed.claimToken,
          {
            status: "UNKNOWN",
            error:
              "Klaviyo accepted the request (HTTP 202) without a job ID; subscription state requires reconciliation.",
          }
        );

      return transitioned
        ? {
            status: "UNKNOWN",
            reason: "PROVIDER_ACCEPTED_RECONCILIATION_REQUIRED",
          }
        : {
            status: "UNKNOWN",
            reason: "PROVIDER_ACCEPTED_DATABASE_TRANSITION_FAILED",
          };
    }

    const transitioned =
      await transitionShopperMarketingSync(
        db,
        claimed.id,
        claimed.claimToken,
        {
          status: "SUBMITTED",
          providerJobId: submission.providerJobId,
        }
      );

    if (!transitioned) {
      return {
        status: "UNKNOWN",
        reason:
          "Provider accepted the request but database transition failed.",
      };
    }

    return {
      status: "SUBMITTED",
      providerJobId: submission.providerJobId,
    };
  } catch {
    // An exception cannot establish whether Klaviyo received
    // the request. Never blindly retry an uncertain outcome.
    const transitioned =
      await transitionShopperMarketingSync(
        db,
        claimed.id,
        claimed.claimToken,
        {
          status: "UNKNOWN",
          error:
            "Provider submission failed or outcome is uncertain.",
        }
      );

    return transitioned
      ? {
          status: "UNKNOWN",
          reason: "PROVIDER_OUTCOME_UNCERTAIN",
        }
      : { status: "TRANSITION_CONFLICT" };
  }
}
