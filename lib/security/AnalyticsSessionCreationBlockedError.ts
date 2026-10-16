export class AnalyticsSessionCreationBlockedError extends Error {
  readonly code = "ANALYTICS_SESSION_CREATION_BLOCKED";

  constructor() {
    super("Analytics session creation rate limit exceeded");
    this.name = "AnalyticsSessionCreationBlockedError";
  }
}
