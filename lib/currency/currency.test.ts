import { describe, expect, it } from "vitest";

import {
  BRAND_CURRENCY_OPTIONS,
  isAllowedBrandCurrency,
  normalizeCurrencyCode,
} from "./codes";

import { convert, safeCurrency } from "./utils";

import { formatMoney } from "../formatMoney";

describe("Currency catalogue", () => {
  it("contains 50 supported currencies", () => {
    expect(BRAND_CURRENCY_OPTIONS).toHaveLength(50);
  });

  it("contains no duplicate currency codes", () => {
    const codes = BRAND_CURRENCY_OPTIONS.map(
      (currency) => currency.code
    );

    expect(new Set(codes).size).toBe(codes.length);
  });

  it("recognises every configured currency", () => {
    for (const currency of BRAND_CURRENCY_OPTIONS) {
      expect(isAllowedBrandCurrency(currency.code)).toBe(true);
      expect(safeCurrency(currency.code)).toBe(currency.code);
    }
  });

  it("normalises lowercase and whitespace", () => {
    expect(normalizeCurrencyCode(" gbp ")).toBe("GBP");
    expect(normalizeCurrencyCode("aed")).toBe("AED");
    expect(normalizeCurrencyCode(null)).toBe("");
  });

  it("rejects unsupported currencies", () => {
    expect(isAllowedBrandCurrency("XYZ")).toBe(false);
    expect(safeCurrency("XYZ")).toBeNull();
    expect(safeCurrency("")).toBeNull();
  });

  it("normalises supported currencies safely", () => {
    expect(safeCurrency(" usd ")).toBe("USD");
    expect(safeCurrency("kwd")).toBe("KWD");
    expect(safeCurrency("omr")).toBe("OMR");
  });
});

describe("Currency conversion", () => {
  const rates = {
    EUR: 1,
    GBP: 0.8,
    USD: 1.2,
    AED: 4.4,
  };

  it("converts GBP to USD using EUR-based rates", () => {
    expect(convert(80, "GBP", "USD", rates)).toBeCloseTo(120);
  });

  it("converts EUR to AED", () => {
    expect(convert(100, "EUR", "AED", rates)).toBeCloseTo(440);
  });

  it("returns the original amount for identical currencies", () => {
    expect(convert(25.75, "GBP", "GBP", rates)).toBe(25.75);
  });

  it("rejects conversions with missing rates", () => {
    expect(convert(100, "GBP", "JPY", rates)).toBeNull();
  });

  it("rejects conversions with invalid currency inputs", () => {
    expect(convert(100, "", "GBP", rates)).toBeNull();
    expect(convert(100, "GBP", "", rates)).toBeNull();
  });

  it("rejects conversions with zero exchange rates", () => {
    expect(
      convert(100, "GBP", "USD", {
        EUR: 1,
        GBP: 0,
        USD: 1.2,
      })
    ).toBeNull();
  });
});

describe("Currency formatting", () => {
  it("formats GBP correctly", () => {
    expect(formatMoney(25.75, "GBP", "en-GB")).toBe(
      "£25.75"
    );
  });

  it("formats USD correctly", () => {
    expect(formatMoney(25.75, "USD", "en-US")).toBe(
      "$25.75"
    );
  });

  it("formats EUR correctly", () => {
    expect(formatMoney(25.75, "EUR", "en-GB")).toContain(
      "25.75"
    );
  });

  it("formats AED with two decimal places", () => {
    const formatted = formatMoney(25.75, "AED", "en-GB");

    expect(formatted).toContain("25.75");
  });

  it("formats JPY without decimal places", () => {
    const formatted = formatMoney(2500, "JPY", "ja-JP");

    expect(formatted).not.toContain(".");
    expect(formatted).toContain("2,500");
  });

  it("formats KWD with three decimal places", () => {
    const formatted = formatMoney(25.75, "KWD", "en-GB");

    expect(formatted).toContain("25.750");
  });

  it("formats OMR with three decimal places", () => {
    const formatted = formatMoney(25.75, "OMR", "en-GB");

    expect(formatted).toContain("25.750");
  });

  it("handles missing and invalid amounts", () => {
    expect(formatMoney(null, "GBP")).toBe("-");
    expect(formatMoney(undefined, "GBP")).toBe("-");
    expect(formatMoney("", "GBP")).toBe("-");
    expect(formatMoney("invalid", "GBP")).toBe("-");
  });
});