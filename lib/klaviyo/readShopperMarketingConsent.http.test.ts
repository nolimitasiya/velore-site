import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  readShopperMarketingConsentFromKlaviyo,
  readShopperListMembershipFromKlaviyo,
} from "./readShopperMarketingConsent";

const originalKey = process.env.KLAVIYO_PRIVATE_API_KEY;

function mockResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

describe("Klaviyo read-only consent HTTP adapter", () => {
  beforeEach(() => {
    process.env.KLAVIYO_PRIVATE_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();

    if (originalKey === undefined) {
      delete process.env.KLAVIYO_PRIVATE_API_KEY;
    } else {
      process.env.KLAVIYO_PRIVATE_API_KEY = originalKey;
    }
  });

  it("requests the normalised email and subscription fields", async () => {
    const fetchMock = vi.mocked(fetch);

    fetchMock.mockResolvedValue(
      mockResponse({
        data: [{
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
        }],
      }) as Response
    );

    const result =
      await readShopperMarketingConsentFromKlaviyo(
        " Shopper@Example.com "
      );

    expect(result).toEqual({
      state: "SUBSCRIBED",
      profileId: "profile-1",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];

    const parsed = new URL(String(url));

    expect(parsed.pathname).toBe("/api/profiles/");

    expect(parsed.searchParams.get("filter")).toBe(
      'equals(email,"shopper@example.com")'
    );

    expect(
      parsed.searchParams.get("additional-fields[profile]")
    ).toBe("subscriptions");

    expect(options?.method).toBe("GET");
    expect(options?.cache).toBe("no-store");
  });

  it("returns UNKNOWN when no profile matches", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ data: [] }) as Response
    );

    expect(
      await readShopperMarketingConsentFromKlaviyo(
        "missing@example.com"
      )
    ).toEqual({
      state: "UNKNOWN",
      profileId: null,
    });
  });

  it("returns UNKNOWN when multiple profiles match", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({
        data: [
          { id: "profile-1" },
          { id: "profile-2" },
        ],
      }) as Response
    );

    expect(
      await readShopperMarketingConsentFromKlaviyo(
        "shared@example.com"
      )
    ).toEqual({
      state: "UNKNOWN",
      profileId: null,
    });
  });

  it("returns UNKNOWN for malformed response data", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ unexpected: true }) as Response
    );

    expect(
      await readShopperMarketingConsentFromKlaviyo(
        "shopper@example.com"
      )
    ).toEqual({
      state: "UNKNOWN",
      profileId: null,
    });
  });

  it("rejects invalid emails before calling Klaviyo", async () => {
    await expect(
      readShopperMarketingConsentFromKlaviyo("invalid-email")
    ).rejects.toThrow("Invalid marketing consent email");

    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects provider HTTP failures", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({}, 503) as Response
    );

    await expect(
      readShopperMarketingConsentFromKlaviyo(
        "shopper@example.com"
      )
    ).rejects.toThrow(
      "Klaviyo profile consent lookup failed (503)"
    );
  });

  it("rejects missing API credentials before calling Klaviyo", async () => {
    delete process.env.KLAVIYO_PRIVATE_API_KEY;

    await expect(
      readShopperMarketingConsentFromKlaviyo(
        "shopper@example.com"
      )
    ).rejects.toThrow("Missing KLAVIYO_PRIVATE_API_KEY");

    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("Klaviyo shopper list membership HTTP adapter", () => {
  const originalKey = process.env.KLAVIYO_PRIVATE_API_KEY;
  const originalListId = process.env.KLAVIYO_SHOPPER_LIST_ID;

  beforeEach(() => {
    process.env.KLAVIYO_PRIVATE_API_KEY = "test-key";
    process.env.KLAVIYO_SHOPPER_LIST_ID = "TPEjdw";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();

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

  it("recognises a profile in the shopper list", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({
        data: [{ id: "profile-1" }],
        links: { next: null },
      }) as Response
    );

    await expect(
      readShopperListMembershipFromKlaviyo("profile-1")
    ).resolves.toBe("MEMBER");

    const [url, options] = vi.mocked(fetch).mock.calls[0];
    const parsed = new URL(String(url));

    expect(parsed.pathname).toBe("/api/lists/TPEjdw/profiles/");
    expect(options?.method).toBe("GET");
    expect(options?.cache).toBe("no-store");
  });

  it("recognises a complete response without membership", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({
        data: [],
        links: { next: null },
      }) as Response
    );

    await expect(
      readShopperListMembershipFromKlaviyo("profile-1")
    ).resolves.toBe("NOT_MEMBER");
  });

  it("does not assume non-membership from an incomplete response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({
        data: [],
        links: { next: "https://a.klaviyo.com/api/next" },
      }) as Response
    );

    await expect(
      readShopperListMembershipFromKlaviyo("profile-1")
    ).resolves.toBe("UNKNOWN");
  });

  it("returns UNKNOWN for malformed responses", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({ unexpected: true }) as Response
    );

    await expect(
      readShopperListMembershipFromKlaviyo("profile-1")
    ).resolves.toBe("UNKNOWN");
  });

  it("returns UNKNOWN for blank profile IDs without contacting Klaviyo", async () => {
    await expect(
      readShopperListMembershipFromKlaviyo(" ")
    ).resolves.toBe("UNKNOWN");

    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects provider HTTP failures", async () => {
    vi.mocked(fetch).mockResolvedValue(
      mockResponse({}, 503) as Response
    );

    await expect(
      readShopperListMembershipFromKlaviyo("profile-1")
    ).rejects.toThrow(
      "Klaviyo shopper list membership lookup failed (503)"
    );
  });

  it("rejects missing shopper-list configuration", async () => {
    delete process.env.KLAVIYO_SHOPPER_LIST_ID;

    await expect(
      readShopperListMembershipFromKlaviyo("profile-1")
    ).rejects.toThrow("Missing KLAVIYO_SHOPPER_LIST_ID");

    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects missing API credentials", async () => {
    delete process.env.KLAVIYO_PRIVATE_API_KEY;

    await expect(
      readShopperListMembershipFromKlaviyo("profile-1")
    ).rejects.toThrow("Missing KLAVIYO_PRIVATE_API_KEY");

    expect(fetch).not.toHaveBeenCalled();
  });
});


describe("Klaviyo shopper-list pagination safety", () => {
  const base = "https://a.klaviyo.com/api/lists/TPEjdw/profiles/";

  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    process.env.KLAVIYO_PRIVATE_API_KEY = "test-private-key";
    process.env.KLAVIYO_SHOPPER_LIST_ID = "TPEjdw";
  });

  function page(ids: string[], next: string | null) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: ids.map((id) => ({ id })),
        links: { next },
      }),
    };
  }

  it("finds membership on a subsequent page", async () => {
    fetchMock
      .mockResolvedValueOnce(
        page(["other-profile"], `${base}?page[cursor]=next`) as Response
      )
      .mockResolvedValueOnce(
        page(["profile-1"], null) as Response
      );

    await expect(
      readShopperListMembershipFromKlaviyo("profile-1")
    ).resolves.toBe("MEMBER");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("confirms non-membership only after the final page", async () => {
    fetchMock
      .mockResolvedValueOnce(
        page(["other-profile"], `${base}?page[cursor]=next`) as Response
      )
      .mockResolvedValueOnce(
        page(["another-profile"], null) as Response
      );

    await expect(
      readShopperListMembershipFromKlaviyo("profile-1")
    ).resolves.toBe("NOT_MEMBER");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects pagination loops without further requests", async () => {
    fetchMock.mockResolvedValue(
      page(["other-profile"], base) as Response
    );

    await expect(
      readShopperListMembershipFromKlaviyo("profile-1")
    ).resolves.toBe("UNKNOWN");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects external pagination destinations", async () => {
    fetchMock.mockResolvedValue(
      page(["other-profile"], "https://example.com/steal") as Response
    );

    await expect(
      readShopperListMembershipFromKlaviyo("profile-1")
    ).resolves.toBe("UNKNOWN");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed pagination destinations", async () => {
    fetchMock.mockResolvedValue(
      page(["other-profile"], "http://[invalid") as Response
    );

    await expect(
      readShopperListMembershipFromKlaviyo("profile-1")
    ).resolves.toBe("UNKNOWN");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not infer non-membership after a failed later page", async () => {
    fetchMock
      .mockResolvedValueOnce(
        page(["other-profile"], `${base}?page[cursor]=next`) as Response
      )
      .mockRejectedValueOnce(new Error("Network unavailable"));

    await expect(
      readShopperListMembershipFromKlaviyo("profile-1")
    ).resolves.toBe("UNKNOWN");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
