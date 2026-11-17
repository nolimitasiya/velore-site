import { describe, expect, it } from "vitest";

import {
  classifyKlaviyoMarketingConsent,
} from "./readShopperMarketingConsent";

describe("Klaviyo marketing consent classification", () => {
  it("recognises subscribed consent", () => {
    expect(
      classifyKlaviyoMarketingConsent({
        id: "profile-1",
        attributes: {
          subscriptions: {
            email: {
              marketing: {
                consent: "SUBSCRIBED",
              },
            },
          },
        },
      })
    ).toEqual({
      state: "SUBSCRIBED",
      profileId: "profile-1",
    });
  });

  it("recognises unsubscribed consent", () => {
    expect(
      classifyKlaviyoMarketingConsent({
        id: "profile-2",
        attributes: {
          subscriptions: {
            email: {
              marketing: {
                consent: "UNSUBSCRIBED",
              },
            },
          },
        },
      })
    ).toEqual({
      state: "UNSUBSCRIBED",
      profileId: "profile-2",
    });
  });

  it("recognises never-subscribed consent", () => {
    expect(
      classifyKlaviyoMarketingConsent({
        id: "profile-3",
        attributes: {
          subscriptions: {
            email: {
              marketing: {
                consent: "NEVER_SUBSCRIBED",
              },
            },
          },
        },
      })
    ).toEqual({
      state: "NEVER_SUBSCRIBED",
      profileId: "profile-3",
    });
  });

  it("does not assume missing consent means unsubscribed", () => {
    expect(
      classifyKlaviyoMarketingConsent({
        id: "profile-4",
        attributes: {},
      })
    ).toEqual({
      state: "UNKNOWN",
      profileId: "profile-4",
    });
  });

  it("rejects missing profile identity", () => {
    expect(
      classifyKlaviyoMarketingConsent({
        attributes: {
          subscriptions: {
            email: {
              marketing: {
                consent: "SUBSCRIBED",
              },
            },
          },
        },
      })
    ).toEqual({
      state: "UNKNOWN",
      profileId: null,
    });
  });

  it("rejects unrecognised consent values", () => {
    expect(
      classifyKlaviyoMarketingConsent({
        id: "profile-5",
        attributes: {
          subscriptions: {
            email: {
              marketing: {
                consent: "PENDING",
              },
            },
          },
        },
      })
    ).toEqual({
      state: "UNKNOWN",
      profileId: "profile-5",
    });
  });

  it("rejects null profiles", () => {
    expect(
      classifyKlaviyoMarketingConsent(null)
    ).toEqual({
      state: "UNKNOWN",
      profileId: null,
    });
  });

  it("captures Klaviyo subscription evidence", () => {
    expect(
      classifyKlaviyoMarketingConsent({
        id: "profile-evidence",
        attributes: {
          subscriptions: {
            email: {
              marketing: {
                consent: "SUBSCRIBED",
                consent_timestamp:
                  "2026-11-15T22:58:28.828457+00:00",
                last_updated:
                  "2026-11-15T22:58:28.828457+00:00",
                method: "API",
                can_receive_email_marketing: true,
              },
            },
          },
        },
      })
    ).toEqual({
      state: "SUBSCRIBED",
      profileId: "profile-evidence",
      consentTimestamp: "2026-11-15T22:58:28.828457+00:00",
      lastUpdated: "2026-11-15T22:58:28.828457+00:00",
      method: "API",
      canReceiveEmailMarketing: true,
    });
  });

  it("does not invent missing subscription evidence", () => {
    expect(
      classifyKlaviyoMarketingConsent({
        id: "profile-no-evidence",
        attributes: {
          subscriptions: {
            email: {
              marketing: {
                consent: "SUBSCRIBED",
              },
            },
          },
        },
      })
    ).toEqual({
      state: "SUBSCRIBED",
      profileId: "profile-no-evidence",
    });
  });

  it("does not treat invalid evidence as verified", () => {
    expect(
      classifyKlaviyoMarketingConsent({
        id: "profile-invalid-evidence",
        attributes: {
          subscriptions: {
            email: {
              marketing: {
                consent: "SUBSCRIBED",
                consent_timestamp: 12345,
                method: false,
                can_receive_email_marketing: "true",
              },
            },
          },
        },
      })
    ).toEqual({
      state: "SUBSCRIBED",
      profileId: "profile-invalid-evidence",
    });
  });
});
