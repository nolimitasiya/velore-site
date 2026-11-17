import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { removeShopperFromKlaviyoList } from "./removeShopperFromList";

describe("removeShopperFromKlaviyoList", () => {
  const originalKey = process.env.KLAVIYO_PRIVATE_API_KEY;
  const originalListId = process.env.KLAVIYO_SHOPPER_LIST_ID;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    process.env.KLAVIYO_PRIVATE_API_KEY = "test-key";
    process.env.KLAVIYO_SHOPPER_LIST_ID = "TPEjdw";
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

  it("removes only the specified profile from the shopper list", async () => {
    const fetchMock = vi.mocked(fetch);

    fetchMock.mockResolvedValue(
      new Response(null, { status: 204 })
    );

    await removeShopperFromKlaviyoList({
      profileId: "profile-123",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];

    expect(url).toBe(
      "https://a.klaviyo.com/api/lists/TPEjdw/relationships/profiles/"
    );

    expect(options?.method).toBe("DELETE");

    const body = JSON.parse(String(options?.body));

    expect(body).toEqual({
      data: [
        {
          type: "profile",
          id: "profile-123",
        },
      ],
    });

    expect(JSON.stringify(body)).not.toContain(
      "UNSUBSCRIBED"
    );
  });

  it("rejects a missing profile ID without contacting Klaviyo", async () => {
    await expect(
      removeShopperFromKlaviyoList({
        profileId: "",
      })
    ).rejects.toThrow();

    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a missing shopper list ID", async () => {
    delete process.env.KLAVIYO_SHOPPER_LIST_ID;

    await expect(
      removeShopperFromKlaviyoList({
        profileId: "profile-123",
      })
    ).rejects.toThrow();

    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not treat a failed API response as success", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, { status: 400 })
    );

    await expect(
      removeShopperFromKlaviyoList({
        profileId: "profile-123",
      })
    ).rejects.toThrow();
  });
});