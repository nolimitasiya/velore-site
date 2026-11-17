import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  submitShopperMarketingConsentToKlaviyo,
} from "./shopperMarketingConsent";

describe("Klaviyo shopper marketing submission HTTP adapter", () => {
  const originalKey = process.env.KLAVIYO_PRIVATE_API_KEY;
  const originalListId = process.env.KLAVIYO_SHOPPER_LIST_ID;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env.KLAVIYO_PRIVATE_API_KEY = "test-key";
    process.env.KLAVIYO_SHOPPER_LIST_ID = "test-list";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();

    if (originalKey === undefined) {
      delete process.env.KLAVIYO_PRIVATE_API_KEY;
    } else {
      process.env.KLAVIYO_PRIVATE_API_KEY = originalKey;
    }

    if (originalListId === undefined) {
      delete process.env.KLAVIYO_SHOPPER_LIST_ID;
    } else {
      process.env.KLAVIYO_SHOPPER_LIST_ID = originalListId;
    }
  });

  it("recognises HTTP 202 with an empty body as accepted without a job ID", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 202 })
    );

    const result = await submitShopperMarketingConsentToKlaviyo({
      email: " Shopper@Example.com ",
      action: "SUBSCRIBE",
    });

    expect(result).toEqual({
      status: "ACCEPTED_WITHOUT_JOB_ID",
    });

    expect(fetch).toHaveBeenCalledTimes(1);

    const [url, options] = vi.mocked(fetch).mock.calls[0];

    expect(url).toBe(
      "https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs"
    );

    expect(options?.method).toBe("POST");

    const body = JSON.parse(String(options?.body));

    expect(body.data.attributes.profiles.data[0].attributes.email)
      .toBe("shopper@example.com");

    expect(body.data.attributes.profiles.data[0].attributes
      .subscriptions.email.marketing.consent)
      .toBe("SUBSCRIBED");
  });

  it("recognises a valid provider job ID", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: "job-123",
          },
        }),
        {
          status: 202,
          headers: {
            "Content-Type": "application/vnd.api+json",
          },
        }
      )
    );

    const result = await submitShopperMarketingConsentToKlaviyo({
      email: "shopper@example.com",
      action: "SUBSCRIBE",
    });

    expect(result).toEqual({
      status: "SUBMITTED_WITH_JOB_ID",
      providerJobId: "job-123",
    });
  });

  it("rejects failed provider responses", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 400 })
    );

    await expect(
      submitShopperMarketingConsentToKlaviyo({
        email: "shopper@example.com",
        action: "SUBSCRIBE",
      })
    ).rejects.toThrow("Klaviyo consent request failed (400)");
  });

  it("does not treat an invalid JSON response as accepted", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("invalid-json", { status: 202 })
    );

    await expect(
      submitShopperMarketingConsentToKlaviyo({
        email: "shopper@example.com",
        action: "SUBSCRIBE",
      })
    ).rejects.toThrow("invalid JSON");
  });

  it("does not treat a missing job ID in a non-empty response as submitted", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ data: {} }),
        { status: 202 }
      )
    );

    await expect(
      submitShopperMarketingConsentToKlaviyo({
        email: "shopper@example.com",
        action: "SUBSCRIBE",
      })
    ).rejects.toThrow("returned no job ID");
  });

  it("uses the unsubscribe endpoint for opt-outs", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 202 })
    );

    const result = await submitShopperMarketingConsentToKlaviyo({
      email: "shopper@example.com",
      action: "UNSUBSCRIBE",
    });

    expect(result).toEqual({
      status: "ACCEPTED_WITHOUT_JOB_ID",
    });

    const [url, options] = vi.mocked(fetch).mock.calls[0];

    expect(url).toBe(
      "https://a.klaviyo.com/api/profile-subscription-bulk-delete-jobs"
    );

    const body = JSON.parse(String(options?.body));

    expect(body.data.attributes.profiles.data[0].attributes
      .subscriptions.email.marketing.consent)
      .toBe("UNSUBSCRIBED");
  });
});