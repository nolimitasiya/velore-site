const KLAVIYO_API_URL = "https://a.klaviyo.com/api";
const KLAVIYO_REVISION = "2026-07-15";

function klaviyoHeaders(apiKey: string) {
  return {
    Authorization: `Klaviyo-API-Key ${apiKey}`,
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    revision: KLAVIYO_REVISION,
  };
}

export async function sendBrandApplicationToKlaviyo(params: {
  applicationId: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string;
  countryCode: string;
  city: string;
  website: string | null;
  socialMedia: string | null;
  platformHosted: string;
}) {
  const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing KLAVIYO_PRIVATE_API_KEY");
  }

  const response = await fetch(`${KLAVIYO_API_URL}/events`, {
    method: "POST",
    headers: klaviyoHeaders(apiKey),

    body: JSON.stringify({
      data: {
        type: "event",

        attributes: {
          metric: {
            data: {
              type: "metric",

              attributes: {
                name: "Brand Application Submitted",
              },
            },
          },

          profile: {
            data: {
              type: "profile",

              attributes: {
                email: params.email,
                first_name: params.firstName,
                last_name: params.lastName,

                location: {
                  city: params.city,
                  country: params.countryCode,
                },

                properties: {
                  relationship: "Brand",
                  brand_name: params.companyName,
                  brand_application_status: "Applied",
                  website: params.website,
                  social_media: params.socialMedia,
                  platform_hosted: params.platformHosted,
                },
              },
            },
          },

          properties: {
            application_id: params.applicationId,
            brand_name: params.companyName,
            country_code: params.countryCode,
            city: params.city,
            website: params.website,
            social_media: params.socialMedia,
            platform_hosted: params.platformHosted,
          },

          unique_id: params.applicationId,
          time: new Date().toISOString(),
        },
      },
    }),
  });

 if (!response.ok) {
  const errorText = await response.text();

  throw new Error(
    `Klaviyo brand application event failed (${response.status}): ${errorText}`
  );
}
}
