const KLAVIYO_API_URL = "https://a.klaviyo.com/api";
const KLAVIYO_REVISION = "2026-07-15";

type BrandInvitationParams = {
  inviteId: string;
  email: string;
  brandName: string;
  onboardingUrl: string;
  expiresAt: Date;
};

export async function sendBrandInvitationToKlaviyo(
  params: BrandInvitationParams
) {
  const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing KLAVIYO_PRIVATE_API_KEY");
  }

  const response = await fetch(`${KLAVIYO_API_URL}/events`, {
    method: "POST",
    headers: {
      Authorization: `Klaviyo-API-Key ${apiKey}`,
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      revision: KLAVIYO_REVISION,
    },
    body: JSON.stringify({
      data: {
        type: "event",
        attributes: {
          metric: {
            data: {
              type: "metric",
              attributes: {
                name: "Brand Invitation Created",
              },
            },
          },
          profile: {
            data: {
              type: "profile",
              attributes: {
                email: params.email.trim().toLowerCase(),
              },
            },
          },
          properties: {
            invite_id: params.inviteId,
            brand_name: params.brandName,
            onboarding_url: params.onboardingUrl,
            expires_at: params.expiresAt.toISOString(),
          },
          time: new Date().toISOString(),
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Klaviyo brand invitation event failed (${response.status}): ${errorText}`
    );
  }
}