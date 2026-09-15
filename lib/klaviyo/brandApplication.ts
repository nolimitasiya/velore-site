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
  analyticsSessionId: string | null;
  acquisitionSource: string | null;
  acquisitionMedium: string | null;
  acquisitionCampaign: string | null;
  acquisitionContent: string | null;
  acquisitionTerm: string | null;
  landingPath: string | null;
  referrer: string | null;
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
  brand_stage: "new",
  website: params.website,
  social_media: params.socialMedia,
  platform_hosted: params.platformHosted,

  veilora_analytics_session_id:
    params.analyticsSessionId,

  veilora_acquisition_source:
    params.acquisitionSource,

  veilora_acquisition_medium:
    params.acquisitionMedium,

  veilora_acquisition_campaign:
    params.acquisitionCampaign,

  veilora_acquisition_content:
    params.acquisitionContent,

  veilora_acquisition_term:
    params.acquisitionTerm,

  veilora_landing_path:
    params.landingPath,

  veilora_referrer:
    params.referrer,
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

  acquisition_source:
    params.acquisitionSource,

  acquisition_medium:
    params.acquisitionMedium,

  acquisition_campaign:
    params.acquisitionCampaign,

  acquisition_content:
    params.acquisitionContent,

  acquisition_term:
    params.acquisitionTerm,

  landing_path:
    params.landingPath,

  referrer:
    params.referrer,
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
