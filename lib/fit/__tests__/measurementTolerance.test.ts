import { describe, expect, it } from "vitest";

import {
  applyManufacturingTolerance,
} from "@/lib/fit/measurementTolerance";

describe("Veilora Fit garment manufacturing tolerance", () => {
  it("expands a single garment measurement by a symmetric declared tolerance", () => {
    const result =
      applyManufacturingTolerance(
        {
          minValueCm: 98,
          maxValueCm: 98,
        },
        {
          minusCm: 2,
          plusCm: 2,
        }
      );

    expect(result).toEqual({
      status: "APPLIED",

      range: {
        minValueCm: 96,
        maxValueCm: 100,
      },
    });
  });

  it("expands an existing garment range without collapsing it", () => {
    const result =
      applyManufacturingTolerance(
        {
          minValueCm: 96,
          maxValueCm: 98,
        },
        {
          minusCm: 1,
          plusCm: 2,
        }
      );

    expect(result).toEqual({
      status: "APPLIED",

      range: {
        minValueCm: 95,
        maxValueCm: 100,
      },
    });
  });

  it("supports asymmetric manufacturing tolerance", () => {
    const result =
      applyManufacturingTolerance(
        {
          minValueCm: 100,
          maxValueCm: 100,
        },
        {
          minusCm: 1,
          plusCm: 3,
        }
      );

    expect(result.range).toEqual({
      minValueCm: 99,
      maxValueCm: 103,
    });
  });

  it("does not allow manufacturing tolerance to create a negative physical measurement", () => {
    const result =
      applyManufacturingTolerance(
        {
          minValueCm: 1,
          maxValueCm: 1,
        },
        {
          minusCm: 2,
          plusCm: 2,
        }
      );

    expect(result).toEqual({
      status: "APPLIED",

      range: {
        minValueCm: 0,
        maxValueCm: 3,
      },
    });
  });

  it("rejects negative tolerance instead of silently applying it", () => {
    const originalRange = {
      minValueCm: 98,
      maxValueCm: 98,
    };

    const result =
      applyManufacturingTolerance(
        originalRange,
        {
          minusCm: -2,
          plusCm: 2,
        }
      );

    expect(result).toEqual({
      status: "INVALID_TOLERANCE",
      range: originalRange,
    });
  });

  it("rejects non-finite tolerance", () => {
    const originalRange = {
      minValueCm: 98,
      maxValueCm: 98,
    };

    const result =
      applyManufacturingTolerance(
        originalRange,
        {
          minusCm: Number.NaN,
          plusCm: 2,
        }
      );

    expect(result).toEqual({
      status: "INVALID_TOLERANCE",
      range: originalRange,
    });
  });
});