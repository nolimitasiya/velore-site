import "server-only";

const KLAVIYO_API_URL = "https://a.klaviyo.com/api";
const KLAVIYO_REVISION = "2026-07-15";

export type KlaviyoMarketingConsentState =
  | "SUBSCRIBED"
  | "UNSUBSCRIBED"
  | "NEVER_SUBSCRIBED"
  | "UNKNOWN";

export type KlaviyoMarketingConsentResult = {
  state: KlaviyoMarketingConsentState;
  profileId: string | null;
  consentTimestamp?: string | null;
  lastUpdated?: string | null;
  method?: string | null;
  canReceiveEmailMarketing?: boolean | null;
};

type KlaviyoProfile = {
  id?: unknown;
  attributes?: {
    subscriptions?: {
      email?: {
        marketing?: {
          consent?: unknown;
          consent_timestamp?: unknown;
          last_updated?: unknown;
          method?: unknown;
          can_receive_email_marketing?: unknown;
        };
      };
    };
  };
};

export function classifyKlaviyoMarketingConsent(
  profile: KlaviyoProfile | null
): KlaviyoMarketingConsentResult {
  if (!profile || typeof profile.id !== "string" || !profile.id.trim()) {
    return {
      state: "UNKNOWN",
      profileId: null,
    };
  }

  const marketing =
    profile.attributes?.subscriptions?.email?.marketing;

  const consent = marketing?.consent;

  const evidence = {
    consentTimestamp:
      typeof marketing?.consent_timestamp === "string"
        ? marketing.consent_timestamp
        : null,
    lastUpdated:
      typeof marketing?.last_updated === "string"
        ? marketing.last_updated
        : null,
    method:
      typeof marketing?.method === "string"
        ? marketing.method
        : null,
    canReceiveEmailMarketing:
      typeof marketing?.can_receive_email_marketing === "boolean"
        ? marketing.can_receive_email_marketing
        : null,
  };

  if (
    consent === "SUBSCRIBED" ||
    consent === "UNSUBSCRIBED" ||
    consent === "NEVER_SUBSCRIBED"
  ) {
    return {
      state: consent,
      profileId: profile.id,
      ...(Object.values(evidence).some((value) => value !== null) ? evidence : {}),
    };
  }

  return {
    state: "UNKNOWN",
    profileId: profile.id,
    ...(Object.values(evidence).some((value) => value !== null) ? evidence : {}),
  };
}

export async function readShopperMarketingConsentFromKlaviyo(
  email: string
): Promise<KlaviyoMarketingConsentResult> {
  const normalisedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalisedEmail)) {
    throw new Error("Invalid marketing consent email");
  }

  const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing KLAVIYO_PRIVATE_API_KEY");
  }

  const filter = `equals(email,"${normalisedEmail.replace(
    /\\/g,
    "\\\\"
  ).replace(/"/g, '\\"')}")`;

  const url = new URL(`${KLAVIYO_API_URL}/profiles/`);

  url.searchParams.set("filter", filter);
  url.searchParams.set(
    "additional-fields[profile]",
    "subscriptions"
  );

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      Accept: "application/vnd.api+json",
      revision: KLAVIYO_REVISION,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Klaviyo profile consent lookup failed (${response.status})`
    );
  }

  const payload: unknown = await response.json();

  if (
    !payload ||
    typeof payload !== "object" ||
    !("data" in payload) ||
    !Array.isArray(payload.data)
  ) {
    return {
      state: "UNKNOWN",
      profileId: null,
    };
  }

  if (payload.data.length !== 1) {
    return {
      state: "UNKNOWN",
      profileId: null,
    };
  }

  const profile = payload.data[0];

  if (!profile || typeof profile !== "object") {
    return {
      state: "UNKNOWN",
      profileId: null,
    };
  }

  return classifyKlaviyoMarketingConsent(profile);
}

/**
 * Read-only check of membership in the dedicated shopper list.
 *
 * This establishes current list membership only. It does not prove
 * that a particular bulk subscription job completed successfully.
 */
export async function readShopperListMembershipFromKlaviyo(
  profileId: string
): Promise<"MEMBER" | "NOT_MEMBER" | "UNKNOWN"> {
  const id = profileId.trim();

  if (!id) {
    return "UNKNOWN";
  }

  const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;
  const listId = process.env.KLAVIYO_SHOPPER_LIST_ID;

  if (!apiKey) {
    throw new Error("Missing KLAVIYO_PRIVATE_API_KEY");
  }

  if (!listId) {
    throw new Error("Missing KLAVIYO_SHOPPER_LIST_ID");
  }

  const baseUrl = new URL(
    `https://a.klaviyo.com/api/lists/${encodeURIComponent(listId)}/profiles/`
  );

  let nextUrl: string | null = baseUrl.toString();

  const visited = new Set<string>();

  for (let page = 0; page < 20 && nextUrl; page++) {
    if (visited.has(nextUrl)) {
      return "UNKNOWN";
    }

    visited.add(nextUrl);

    let response: Response;

    try {
      response = await fetch(nextUrl, {
        method: "GET",
        headers: {
          Authorization: `Klaviyo-API-Key ${apiKey}`,
          Accept: "application/json",
          revision: "2026-07-15",
        },
        cache: "no-store",
      });
    } catch {
      return "UNKNOWN";
    }

    if (!response.ok) {
      throw new Error(
        `Klaviyo shopper list membership lookup failed (${response.status})`
      );
    }

    let body: unknown;

    try {
      body = await response.json();
    } catch {
      return "UNKNOWN";
    }

    if (!body || typeof body !== "object") {
      return "UNKNOWN";
    }

    const payload = body as {
      data?: Array<{ id?: string }>;
      links?: { next?: string | null };
    };

    if (!Array.isArray(payload.data)) {
      return "UNKNOWN";
    }

    for (const profile of payload.data) {
      if (!profile || typeof profile.id !== "string") {
        return "UNKNOWN";
      }

      if (profile.id === id) {
        return "MEMBER";
      }
    }

    const next = payload.links?.next;

    if (next == null || next === "") {
      return "NOT_MEMBER";
    }

    if (typeof next !== "string") {
      return "UNKNOWN";
    }

    let parsed: URL;

    try {
      parsed = new URL(next, baseUrl);
    } catch {
      return "UNKNOWN";
    }

    if (
      parsed.protocol !== "https:" ||
      parsed.origin !== baseUrl.origin ||
      parsed.pathname !== baseUrl.pathname
    ) {
      return "UNKNOWN";
    }

    nextUrl = parsed.toString();
  }

  return "UNKNOWN";
}
