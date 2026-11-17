import "server-only";

const KLAVIYO_API_URL = "https://a.klaviyo.com/api";
const KLAVIYO_REVISION = "2026-07-15";

type RemoveShopperParams = {
  profileId: string;
};

export async function removeShopperFromKlaviyoList(
  params: RemoveShopperParams
): Promise<void> {
  const profileId = params.profileId.trim();

  if (!profileId) {
    throw new Error("Missing Klaviyo profile ID");
  }

  const listId = process.env.KLAVIYO_SHOPPER_LIST_ID?.trim();

  if (!listId) {
    throw new Error("Missing KLAVIYO_SHOPPER_LIST_ID");
  }

  const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing KLAVIYO_PRIVATE_API_KEY");
  }

  const endpoint =
    `${KLAVIYO_API_URL}/lists/` +
    `${encodeURIComponent(listId)}/relationships/profiles/`;

  const response = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      revision: KLAVIYO_REVISION,
    },
    body: JSON.stringify({
      data: [
        {
          type: "profile",
          id: profileId,
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Klaviyo shopper-list removal failed (${response.status})`
    );
  }
}