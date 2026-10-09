import { describe, expect, it } from "vitest";

import {
  formatMeasurementValue,
} from "../formatMeasurementValue";

describe("formatMeasurementValue", () => {
  it("formats a normal RANGE in centimetres", () => {
    expect(
      formatMeasurementValue(88, 96, "CM", "RANGE")
    ).toBe("88–96");
  });

  it("formats a single-value RANGE", () => {
    expect(
      formatMeasurementValue(96, 96, "CM", "RANGE")
    ).toBe("96");
  });

  it("formats an UPPER_BOUND without inventing a minimum", () => {
    expect(
      formatMeasurementValue(null, 96, "CM", "UPPER_BOUND")
    ).toBe("Up to 96");
  });

  it("converts an UPPER_BOUND to inches", () => {
    expect(
      formatMeasurementValue(null, 96, "IN", "UPPER_BOUND")
    ).toBe("Up to 37.8");
  });

  it("rejects a RANGE with a missing minimum", () => {
    expect(
      formatMeasurementValue(null, 96, "CM", "RANGE")
    ).toBe("—");
  });

  it("rejects an UPPER_BOUND with a missing maximum", () => {
    expect(
      formatMeasurementValue(null, null, "CM", "UPPER_BOUND")
    ).toBe("—");
  });

  it("rejects non-finite measurements", () => {
    expect(
      formatMeasurementValue(NaN, 96, "CM", "RANGE")
    ).toBe("—");

    expect(
      formatMeasurementValue(88, Infinity, "CM", "RANGE")
    ).toBe("—");

    expect(
      formatMeasurementValue(null, NaN, "CM", "UPPER_BOUND")
    ).toBe("—");
  });

  it("rejects a reversed RANGE", () => {
    expect(
      formatMeasurementValue(100, 90, "CM", "RANGE")
    ).toBe("—");
  });
});