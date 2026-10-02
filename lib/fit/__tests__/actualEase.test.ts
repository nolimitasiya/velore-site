import { describe, expect, it } from "vitest";

import {
  calculateActualEase,
} from "@/lib/fit/actualEase";

describe("Veilora Fit actual ease", () => {
  it("calculates actual ease for an exact garment measurement", () => {
    const result = calculateActualEase(
      95,
      {
        minValueCm: 108,
        maxValueCm: 108,
      }
    );

    expect(result).toEqual({
      status: "CALCULATED",

      range: {
        minEaseCm: 13,
        maxEaseCm: 13,
      },

      shopperValueCm: 95,

      garmentRange: {
        minValueCm: 108,
        maxValueCm: 108,
      },
    });
  });

  it("preserves actual ease as a range when garment evidence is a range", () => {
    const result = calculateActualEase(
      95,
      {
        minValueCm: 106,
        maxValueCm: 110,
      }
    );

    expect(result).toEqual({
      status: "CALCULATED",

      range: {
        minEaseCm: 11,
        maxEaseCm: 15,
      },

      shopperValueCm: 95,

      garmentRange: {
        minValueCm: 106,
        maxValueCm: 110,
      },
    });
  });

  it("preserves negative actual ease", () => {
    const result = calculateActualEase(
      94,
      {
        minValueCm: 86,
        maxValueCm: 88,
      }
    );

    expect(result).toEqual({
      status: "CALCULATED",

      range: {
        minEaseCm: -8,
        maxEaseCm: -6,
      },

      shopperValueCm: 94,

      garmentRange: {
        minValueCm: 86,
        maxValueCm: 88,
      },
    });
  });

  it("rejects a zero shopper measurement", () => {
    expect(
      calculateActualEase(0, {
        minValueCm: 106,
        maxValueCm: 110,
      })
    ).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
      range: null,
    });
  });

  it("rejects a negative shopper measurement", () => {
    expect(
      calculateActualEase(-95, {
        minValueCm: 106,
        maxValueCm: 110,
      })
    ).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
      range: null,
    });
  });

  it("rejects a non-finite shopper measurement", () => {
    expect(
      calculateActualEase(
        Number.NaN,
        {
          minValueCm: 106,
          maxValueCm: 110,
        }
      )
    ).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
      range: null,
    });
  });

  it("rejects a malformed garment range", () => {
    expect(
      calculateActualEase(95, {
        minValueCm: 110,
        maxValueCm: 106,
      })
    ).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
      range: null,
    });
  });

  it("rejects a negative garment measurement", () => {
    expect(
      calculateActualEase(95, {
        minValueCm: -1,
        maxValueCm: 110,
      })
    ).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
      range: null,
    });
  });

  it("rejects a non-finite garment range", () => {
    expect(
      calculateActualEase(95, {
        minValueCm: 106,
        maxValueCm: Number.POSITIVE_INFINITY,
      })
    ).toEqual({
      status: "INSUFFICIENT_EVIDENCE",
      range: null,
    });
  });
});