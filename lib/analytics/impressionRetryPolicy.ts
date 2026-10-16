export const IMPRESSION_SESSION_RETRY_DELAY_MS = 2000;

export const MAX_IMPRESSION_SESSION_RETRIES = 1;

export function shouldRetryImpressionSession(
  retryCount: number,
  isMounted: boolean,
): boolean {
  return (
    isMounted &&
    Number.isInteger(retryCount) &&
    retryCount >= 0 &&
    retryCount < MAX_IMPRESSION_SESSION_RETRIES
  );
}
