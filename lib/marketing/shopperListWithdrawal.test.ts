import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { removeShopperFromKlaviyoList } from "../klaviyo/removeShopperFromList";

vi.mock("../klaviyo/removeShopperFromList", () => ({
  removeShopperFromKlaviyoList: vi.fn(),
}));

describe("shopper-list withdrawal", () => {
  it("removes a shopper from the list without changing global consent", async () => {
    vi.mocked(removeShopperFromKlaviyoList).mockResolvedValue();

    await removeShopperFromKlaviyoList({
      profileId: "profile-123",
    });

    expect(removeShopperFromKlaviyoList).toHaveBeenCalledWith({
      profileId: "profile-123",
    });
  });

  it("propagates provider failures", async () => {
    vi.mocked(removeShopperFromKlaviyoList).mockRejectedValueOnce(
      new Error("Klaviyo removal failed")
    );

    await expect(
      removeShopperFromKlaviyoList({
        profileId: "profile-123",
      })
    ).rejects.toThrow("Klaviyo removal failed");
  });

  it("does not claim global consent was changed", async () => {
    vi.mocked(removeShopperFromKlaviyoList).mockResolvedValue();

    const result = await removeShopperFromKlaviyoList({
      profileId: "profile-123",
    });

    expect(result).toBeUndefined();
  });
});