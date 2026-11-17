export type NewsletterSubscriptionStatus =
  | "pending"
  | "subscribed"
  | "unsubscribed";

export type NewsletterSubscriptionGenerationDecision = {
  nextStatus: "pending" | "subscribed";
  incrementGeneration: boolean;
  sendConfirmation: boolean;
};

export function decideNewsletterSubscriptionGeneration(
  status: NewsletterSubscriptionStatus | null
): NewsletterSubscriptionGenerationDecision {
  if (status === null) {
    return {
      nextStatus: "pending",
      incrementGeneration: false,
      sendConfirmation: true,
    };
  }

  if (status === "subscribed") {
    return {
      nextStatus: "subscribed",
      incrementGeneration: false,
      sendConfirmation: false,
    };
  }

  if (status === "pending") {
    return {
      nextStatus: "pending",
      incrementGeneration: false,
      sendConfirmation: true,
    };
  }

  return {
    nextStatus: "pending",
    incrementGeneration: true,
    sendConfirmation: true,
  };
}