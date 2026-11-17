import "server-only";

const KLAVIYO_API_URL = "https://a.klaviyo.com/api";
const KLAVIYO_REVISION = "2026-07-15";

type ConsentAction = "SUBSCRIBE" | "UNSUBSCRIBE";

type SubmitConsentParams = {
  email: string;
  action: ConsentAction;
  listId?: string;
};

export type KlaviyoConsentSubmission =
  | { status: "ACCEPTED_WITHOUT_JOB_ID" }
  | { status: "SUBMITTED_WITH_JOB_ID"; providerJobId: string };

function getHeaders(apiKey: string) {
  return {
    Authorization: `Klaviyo-API-Key ${apiKey}`,
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    revision: KLAVIYO_REVISION,
  };
}

function getApiKey(): string {
  const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing KLAVIYO_PRIVATE_API_KEY");
  }

  return apiKey;
}

function normaliseEmail(email: string): string {
  const normalised = email.trim().toLowerCase();

  if (
    !normalised ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalised)
  ) {
    throw new Error("Invalid marketing consent email");
  }

  return normalised;
}

export async function submitShopperMarketingConsentToKlaviyo(
  params: SubmitConsentParams
): Promise<KlaviyoConsentSubmission> {
  const email = normaliseEmail(params.email);
  const apiKey = getApiKey();

  const listId =
    params.listId ??
    process.env.KLAVIYO_SHOPPER_LIST_ID;

  if (!listId || !listId.trim()) {
    throw new Error("Missing Klaviyo marketing list ID");
  }

  const subscribing = params.action === "SUBSCRIBE";

  const endpoint = subscribing
    ? "profile-subscription-bulk-create-jobs"
    : "profile-subscription-bulk-delete-jobs";

  const resourceType = subscribing
    ? "profile-subscription-bulk-create-job"
    : "profile-subscription-bulk-delete-job";

  const body = {
    data: {
      type: resourceType,
      attributes: {
        profiles: {
          data: [
            {
              type: "profile",
              attributes: {
                email,
                subscriptions: {
                  email: {
                    marketing: {
                      consent: subscribing
                        ? "SUBSCRIBED"
                        : "UNSUBSCRIBED",
                    },
                  },
                },
              },
            },
          ],
        },
        ...(subscribing
          ? { historical_import: false }
          : {}),
      },
      relationships: {
        list: {
          data: {
            type: "list",
            id: listId.trim(),
          },
        },
      },
    },
  };

  const response = await fetch(
    `${KLAVIYO_API_URL}/${endpoint}`,
    {
      method: "POST",
      headers: getHeaders(apiKey),
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Klaviyo consent request failed (${response.status})`
    );
  }

  const responseText = await response.text();

  if (!responseText.trim()) {
    if (response.status === 202) {
      return { status: "ACCEPTED_WITHOUT_JOB_ID" };
    }

    throw new Error(
      `Klaviyo consent request returned an empty response (${response.status}); outcome requires reconciliation`
    );
  }

  let result: unknown;

  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(
      `Klaviyo consent request returned invalid JSON (${response.status}); outcome requires reconciliation`
    );
  }

  if (
    !result ||
    typeof result !== "object" ||
    !("data" in result) ||
    !result.data ||
    typeof result.data !== "object" ||
    !("id" in result.data) ||
    typeof result.data.id !== "string" ||
    !result.data.id.trim()
  ) {
    throw new Error(
      "Klaviyo consent request returned no job ID"
    );
  }

  return {
    status: "SUBMITTED_WITH_JOB_ID",
    providerJobId: result.data.id,
  };
}
