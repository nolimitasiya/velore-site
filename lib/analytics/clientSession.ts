"use client";

let sessionPromise:
  Promise<boolean> | null = null;

export function ensureAnalyticsSession():
  Promise<boolean> {
  if (sessionPromise) {
    return sessionPromise;
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  const attribution = {
    utmSource:
      params.get("utm_source"),

    utmMedium:
      params.get("utm_medium"),

    utmCampaign:
      params.get("utm_campaign"),

    utmContent:
      params.get("utm_content"),

    utmTerm:
      params.get("utm_term"),

    landingPath:
      `${window.location.pathname}${window.location.search}`,

    referrer:
      document.referrer || null,
  };

  sessionPromise = fetch(
    "/api/events/session",
    {
      method: "POST",

      credentials:
        "same-origin",

      keepalive:
        true,

      headers: {
        "content-type":
          "application/json",
      },

      body: JSON.stringify(
        attribution
      ),
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