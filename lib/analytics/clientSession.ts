"use client";

let sessionPromise:
  Promise<boolean> | null = null;

export function ensureAnalyticsSession():
  Promise<boolean> {
  if (sessionPromise) {
    return sessionPromise;
  }

  sessionPromise = fetch(
    "/api/events/session",
    {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
    }
  )
    .then(async (response) => {
      if (!response.ok) {
        sessionPromise = null;
        return false;
      }

      const data =
        await response
          .json()
          .catch(() => null);

      if (!data?.ok) {
        sessionPromise = null;
        return false;
      }

      return true;
    })
    .catch((error) => {
      console.error(
        "Unable to initialise analytics session",
        error
      );

      sessionPromise = null;

      return false;
    });

  return sessionPromise;
}