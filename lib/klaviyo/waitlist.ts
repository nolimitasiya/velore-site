const KLAVIYO_API_URL = "https://a.klaviyo.com/api";

export async function syncWaitlistSubscriberToKlaviyo(params: {
  email: string;
  name: string;
}) {
  const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;
  const listId = process.env.KLAVIYO_WAITLIST_LIST_ID;

  if (!apiKey) {
    throw new Error("Missing KLAVIYO_PRIVATE_API_KEY");
  }

  if (!listId) {
    throw new Error("Missing KLAVIYO_WAITLIST_LIST_ID");
  }

  const response = await fetch(
    `${KLAVIYO_API_URL}/profile-subscription-bulk-create-jobs`,
    {
      method: "POST",
      headers: {
        Authorization: `Klaviyo-API-Key ${apiKey}`,
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        revision: "2026-07-15",
      },
      body: JSON.stringify({
        data: {
          type: "profile-subscription-bulk-create-job",
          attributes: {
            profiles: {
              data: [
                {
                  type: "profile",
                  attributes: {
  email: params.email,
  subscriptions: {
    email: {
      marketing: {
        consent: "SUBSCRIBED",
      },
    },
  },
},
                },
              ],
            },
            historical_import: false,
          },
          relationships: {
            list: {
              data: {
                type: "list",
                id: listId,
              },
            },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Klaviyo waitlist sync failed (${response.status}): ${errorText}`
    );
  }
}