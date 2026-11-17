import { describe, expect, it } from "vitest";

import {
  getShopperAge,
  isShopperMarketingEligible,
} from "./shopperMarketingEligibility";

const now = new Date("2026-11-12T12:00:00.000Z");

function eligibleShopper(
  dateOfBirth: Date = new Date("1998-06-15T00:00:00.000Z")
) {
  return {
    marketingConsent: true,
    marketingConsentAt: new Date("2026-11-01T10:00:00.000Z"),
    dateOfBirth,
  };
}

describe("getShopperAge", () => {
  it("calculates an adult's age", () => {
    expect(
      getShopperAge(
        new Date("1998-06-15T00:00:00.000Z"),
        now
      )
    ).toBe(28);
  });

  it("returns 17 the day before an 18th birthday", () => {
    expect(
      getShopperAge(
        new Date("2008-11-13T00:00:00.000Z"),
        now
      )
    ).toBe(17);
  });

  it("returns 18 on the 18th birthday", () => {
    expect(
      getShopperAge(
        new Date("2008-11-12T00:00:00.000Z"),
        now
      )
    ).toBe(18);
  });

  it("returns null for a future date of birth", () => {
    expect(
      getShopperAge(
        new Date("2027-01-01T00:00:00.000Z"),
        now
      )
    ).toBeNull();
  });

  it("returns null for an invalid date of birth", () => {
    expect(
      getShopperAge(new Date("invalid"), now)
    ).toBeNull();
  });

  it("handles leap-year birthdays consistently", () => {
    expect(
      getShopperAge(
        new Date("2008-02-29T00:00:00.000Z"),
        new Date("2026-02-28T12:00:00.000Z")
      )
    ).toBe(17);

    expect(
      getShopperAge(
        new Date("2008-02-29T00:00:00.000Z"),
        new Date("2026-03-01T12:00:00.000Z")
      )
    ).toBe(18);
  });
});

describe("isShopperMarketingEligible", () => {
  it("allows an adult with explicit consent", () => {
    expect(
      isShopperMarketingEligible(
        eligibleShopper(),
        now
      )
    ).toBe(true);
  });

  it("allows a shopper on their 18th birthday", () => {
    expect(
      isShopperMarketingEligible(
        eligibleShopper(
          new Date("2008-11-12T00:00:00.000Z")
        ),
        now
      )
    ).toBe(true);
  });

  it("rejects a shopper aged 17", () => {
    expect(
      isShopperMarketingEligible(
        eligibleShopper(
          new Date("2008-11-13T00:00:00.000Z")
        ),
        now
      )
    ).toBe(false);
  });

  it("rejects a shopper aged 13", () => {
    expect(
      isShopperMarketingEligible(
        eligibleShopper(
          new Date("2013-06-15T00:00:00.000Z")
        ),
        now
      )
    ).toBe(false);
  });

  it("rejects missing or withdrawn consent", () => {
    expect(
      isShopperMarketingEligible(
        {
          ...eligibleShopper(),
          marketingConsent: false,
        },
        now
      )
    ).toBe(false);
  });

  it("rejects a missing consent timestamp", () => {
    expect(
      isShopperMarketingEligible(
        {
          ...eligibleShopper(),
          marketingConsentAt: null,
        },
        now
      )
    ).toBe(false);
  });

  it("rejects a missing date of birth", () => {
    expect(
      isShopperMarketingEligible(
        {
          ...eligibleShopper(),
          dateOfBirth: null,
        },
        now
      )
    ).toBe(false);
  });

  it("rejects an invalid date of birth", () => {
    expect(
      isShopperMarketingEligible(
        eligibleShopper(new Date("invalid")),
        now
      )
    ).toBe(false);
  });

  it("rejects a future date of birth", () => {
    expect(
      isShopperMarketingEligible(
        eligibleShopper(
          new Date("2027-01-01T00:00:00.000Z")
        ),
        now
      )
    ).toBe(false);
  });

  it("rejects a future consent timestamp", () => {
    expect(
      isShopperMarketingEligible(
        {
          ...eligibleShopper(),
          marketingConsentAt:
            new Date("2026-11-13T00:00:00.000Z"),
        },
        now
      )
    ).toBe(false);
  });

  it("rejects an invalid consent timestamp", () => {
    expect(
      isShopperMarketingEligible(
        {
          ...eligibleShopper(),
          marketingConsentAt: new Date("invalid"),
        },
        now
      )
    ).toBe(false);
  });
});
