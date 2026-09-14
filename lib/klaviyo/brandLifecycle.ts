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

export type BrandLifecycleStage =
  | "new"
  | "contacted"
  | "invited"
  | "contract_sent"
  | "contract_signed"
  | "onboarded"
  | "rejected";

export type BrandLifecycleEventName =
  | "Brand Invited"
  | "Brand Contract Sent"
  | "Brand Contract Signed"
  | "Brand Onboarded"
  | "Brand Rejected";

type BrandProfileParams = {
  applicationId: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  companyName?: string | null;
  phone?: string | null;
  website?: string | null;
  socialMedia?: string | null;
  countryCode?: string | null;
  city?: string | null;
  stage: BrandLifecycleStage;
};

type BrandLifecycleEventParams = BrandProfileParams & {
  eventName: BrandLifecycleEventName;
  schedulerUrl?: string;
  contractUrl?: string;
  onboardingUrl?: string;
  emailSubject?: string;
  emailMessage?: string;
  rejectionReason?: string;
};

function clean(value?: string | null) {
  const s = String(value ?? "").trim();
  return s || undefined;
}

function getApiKey() {
  const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;

  if (!apiKey) {
    throw new Error("Missing KLAVIYO_PRIVATE_API_KEY");
  }

  return apiKey;
}

export async function syncBrandProfileToKlaviyo(
  params: BrandProfileParams
) {
  const apiKey = getApiKey();

  const attributes: Record<string, unknown> = {
    email: params.email.trim().toLowerCase(),

    properties: {
  brand_application_id: params.applicationId,
  brand_name: clean(params.companyName),
  brand_stage: params.stage,
  phone: clean(params.phone),
  website: clean(params.website),
  social_media: clean(params.socialMedia),
  country_code: clean(params.countryCode),
  city: clean(params.city),
},
  };

  const firstName = clean(params.firstName);
  const lastName = clean(params.lastName);
  const city = clean(params.city);
  const country = clean(params.countryCode);

  if (firstName) attributes.first_name = firstName;
  if (lastName) attributes.last_name = lastName;

  if (city || country) {
    attributes.location = {
      ...(city ? { city } : {}),
      ...(country ? { country } : {}),
    };
  }

  const response = await fetch(`${KLAVIYO_API_URL}/profile-import`, {
    method: "POST",
    headers: klaviyoHeaders(apiKey),

    body: JSON.stringify({
      data: {
        type: "profile",
        attributes,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Klaviyo brand profile sync failed (${response.status}): ${errorText}`
    );
  }
}

export async function sendBrandLifecycleEventToKlaviyo(
  params: BrandLifecycleEventParams
) {
  const apiKey = getApiKey();

  const eventProperties: Record<string, unknown> = {
    application_id: params.applicationId,
    brand_name: clean(params.companyName),
    brand_stage: params.stage,
  };

  if (params.schedulerUrl) {
    eventProperties.scheduler_url = params.schedulerUrl;
  }

  if (params.contractUrl) {
    eventProperties.contract_url = params.contractUrl;
  }

  if (params.onboardingUrl) {
    eventProperties.onboarding_url = params.onboardingUrl;
  }

  if (params.emailSubject) {
    eventProperties.email_subject = params.emailSubject;
  }

  if (params.emailMessage) {
    eventProperties.email_message = params.emailMessage;
  }

  if (params.rejectionReason) {
  eventProperties.rejection_reason = params.rejectionReason;
}

  const profileAttributes: Record<string, unknown> = {
    email: params.email.trim().toLowerCase(),

    properties: {
  brand_application_id: params.applicationId,
  brand_name: clean(params.companyName),
  brand_stage: params.stage,
},
  };

  const firstName = clean(params.firstName);
  const lastName = clean(params.lastName);
  const city = clean(params.city);
  const country = clean(params.countryCode);

  if (firstName) profileAttributes.first_name = firstName;
  if (lastName) profileAttributes.last_name = lastName;

  if (city || country) {
    profileAttributes.location = {
      ...(city ? { city } : {}),
      ...(country ? { country } : {}),
    };
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
                name: params.eventName,
              },
            },
          },

          profile: {
            data: {
              type: "profile",
              attributes: profileAttributes,
            },
          },

          properties: eventProperties,

          time: new Date().toISOString(),
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Klaviyo brand lifecycle event failed (${response.status}): ${errorText}`
    );
  }
}