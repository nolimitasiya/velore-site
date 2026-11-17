import "server-only";

import { resend } from "@/lib/resend/client";

import type { NewsletterWelcomeProviderRecord } from "./verifyNewsletterWelcomeProviderEvidence";

export type NewsletterWelcomeProviderLookupResult =
  | {
      status: "FOUND";
      record: NewsletterWelcomeProviderRecord;
      createdAt: string;
      lastEvent: string;
    }
  | {
      status: "UNAVAILABLE";
      reason:
        | "INVALID_PROVIDER_ID"
        | "PROVIDER_NOT_CONFIGURED"
        | "PROVIDER_ERROR"
        | "INVALID_PROVIDER_RESPONSE";
    };

export async function getNewsletterWelcomeProviderEmail(
  providerMessageId: string
): Promise<NewsletterWelcomeProviderLookupResult> {
  const id = providerMessageId?.trim();

  if (!id || id.length > 500 || /\s/.test(id)) {
    return {
      status: "UNAVAILABLE",
      reason: "INVALID_PROVIDER_ID",
    };
  }

  if (!resend) {
    return {
      status: "UNAVAILABLE",
      reason: "PROVIDER_NOT_CONFIGURED",
    };
  }

  try {
    const { data, error } = await resend.emails.get(id);

    if (error) {
      return {
        status: "UNAVAILABLE",
        reason: "PROVIDER_ERROR",
      };
    }

    if (
      !data ||
      data.id !== id ||
      !Array.isArray(data.to) ||
      !data.to.every((recipient) => typeof recipient === "string") ||
      (data.tags !== undefined &&
        (!Array.isArray(data.tags) ||
          !data.tags.every(
            (tag) =>
              tag !== null &&
              typeof tag === "object" &&
              typeof tag.name === "string" &&
              typeof tag.value === "string"
          ))) ||
      typeof data.from !== "string" ||
      typeof data.subject !== "string" ||
      typeof data.created_at !== "string" ||
      typeof data.last_event !== "string"
    ) {
      return {
        status: "UNAVAILABLE",
        reason: "INVALID_PROVIDER_RESPONSE",
      };
    }

    return {
      status: "FOUND",
      record: {
        id: data.id,
        to: data.to,
        from: data.from,
        subject: data.subject,
        tags: data.tags,
      },
      createdAt: data.created_at,
      lastEvent: data.last_event,
    };
  } catch {
    return {
      status: "UNAVAILABLE",
      reason: "PROVIDER_ERROR",
    };
  }
}