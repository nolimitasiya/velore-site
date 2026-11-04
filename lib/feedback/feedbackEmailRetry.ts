export const FEEDBACK_EMAIL_MAX_ATTEMPTS = 5;

export const FEEDBACK_EMAIL_LEASE_MS = 2 * 60 * 1000;

const RETRY_DELAYS_MS = [
  60 * 1000,       // 1 minute
  5 * 60 * 1000,   // 5 minutes
  15 * 60 * 1000,  // 15 minutes
  60 * 60 * 1000,  // 1 hour
];

export function getFeedbackEmailRetryDecision(
  attempts: number,
  now: Date
):
  | { retry: true; nextAttemptAt: Date }
  | { retry: false; nextAttemptAt: null } {
  if (
    !Number.isInteger(attempts) ||
    attempts < 1
  ) {
    throw new Error("Invalid feedback email attempt count.");
  }

  if (attempts >= FEEDBACK_EMAIL_MAX_ATTEMPTS) {
    return {
      retry: false,
      nextAttemptAt: null,
    };
  }

  const delay = RETRY_DELAYS_MS[
    Math.min(attempts - 1, RETRY_DELAYS_MS.length - 1)
  ];

  return {
    retry: true,
    nextAttemptAt: new Date(now.getTime() + delay),
  };
}