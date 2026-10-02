import { describe, expect, it } from "vitest";
import { FitUnit } from "@prisma/client";

import { normalizeLengthToCm } from "../productLengthNormalization";

describe("normalizeLengthToCm", () => {
  it("keeps centimetres unchanged", () => {
    expect(
      normalizeLengthToCm(147.32, FitUnit.CM)
    ).toBe(147.32);
  });

  it("converts 54 inches to centimetres", () => {
    expect(
      normalizeLengthToCm(54, FitUnit.IN)
    ).toBeCloseTo(137.16, 10);
  });

  it("converts 56 inches to centimetres", () => {
    expect(
      normalizeLengthToCm(56, FitUnit.IN)
    ).toBeCloseTo(142.24, 10);
  });

  it("converts 58 inches to centimetres", () => {
    expect(
      normalizeLengthToCm(58, FitUnit.IN)
    ).toBeCloseTo(147.32, 10);
  });

  it("rejects zero", () => {
    expect(() =>
      normalizeLengthToCm(0, FitUnit.CM)
    ).toThrow(
      "Length value must be a positive finite number."
    );
  });

  it("rejects negative values", () => {
    expect(() =>
      normalizeLengthToCm(-58, FitUnit.IN)
    ).toThrow(
      "Length value must be a positive finite number."
    );
  });

  it("rejects non-finite values", () => {
    expect(() =>
      normalizeLengthToCm(
        Number.POSITIVE_INFINITY,
        FitUnit.CM
      )
    ).toThrow(
      "Length value must be a positive finite number."
    );
  });
});