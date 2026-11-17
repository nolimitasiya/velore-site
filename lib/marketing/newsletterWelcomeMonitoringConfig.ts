/**
 * Monitoring threshold for newsletter welcome-email claims.
 *
 * A claim older than this threshold is considered stale for
 * administrative monitoring purposes.
 *
 * This constant does not trigger recovery, provider submission,
 * email delivery, or automatic retries.
 */
export const NEWSLETTER_WELCOME_STALE_MONITORING_MS =
  30 * 60 * 1000;

export function getNewsletterWelcomeStaleMonitoringCutoff(
  now: Date = new Date()
): Date {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new Error("Invalid newsletter monitoring time.");
  }

  return new Date(
    now.getTime() - NEWSLETTER_WELCOME_STALE_MONITORING_MS
  );
}