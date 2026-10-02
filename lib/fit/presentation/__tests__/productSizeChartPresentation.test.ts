import { describe, expect, it } from "vitest";

import { presentProductSizeCharts } from "../productSizeChartPresentation";

function makeProductSize({
  productSizeId,
  productSizeName,
  chartId = "chart-1",
  chartName = "Women's General",
  sizeLabel,
  sourceUnit = "CM",
  measurementBasis = "GARMENT",
  measurements = [],
}: {
  productSizeId: string;
  productSizeName: string;
  chartId?: string;
  chartName?: string;
  sizeLabel: string;
  sourceUnit?: "CM" | "IN";
  measurementBasis?: "BODY" | "GARMENT" | "UNKNOWN";
  measurements?: Array<{
    type: string;
    component: string;
    minValueCm?: number | null;
    maxValueCm?: number | null;
    sourceMinValue?: number | null;
    sourceMaxValue?: number | null;
  }>;
}) {
  return {
    productId: "product-1",
    sizeId: productSizeId,

    size: {
      id: productSizeId,
      name: productSizeName,
      slug: productSizeName.toLowerCase(),
    },

    sizeChartMapping: {
      productId: "product-1",
      sizeId: productSizeId,
      chartEntryId: `entry-${chartId}-${sizeLabel}`,

      chartEntry: {
        id: `entry-${chartId}-${sizeLabel}`,
        chartId,
        sizeLabel,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),

        chart: {
          id: chartId,
          name: chartName,
          sourceUnit,
          measurementBasis,
          source: "BRAND_WEBSITE",
          sourceUrl: "https://example.com/size-chart",
          lastVerifiedAt: new Date("2026-09-24"),
        },

        measurements: measurements.map(
          (measurement, index) => ({
            id: `measurement-${index}`,
            entryId: `entry-${chartId}-${sizeLabel}`,
            type: measurement.type,
            component: measurement.component,
            sourceUnit,
            minValueCm:
              measurement.minValueCm ?? null,
            maxValueCm:
              measurement.maxValueCm ?? null,
            sourceMinValue:
              measurement.sourceMinValue ?? null,
            sourceMaxValue:
              measurement.sourceMaxValue ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      },
    },
  };
}

describe("presentProductSizeCharts", () => {
  it("groups multiple product sizes mapped to the same chart", () => {
    const result = presentProductSizeCharts([
      makeProductSize({
        productSizeId: "size-s",
        productSizeName: "S",
        sizeLabel: "S",
      }),
      makeProductSize({
        productSizeId: "size-m",
        productSizeName: "M",
        sizeLabel: "M",
      }),
      makeProductSize({
        productSizeId: "size-l",
        productSizeName: "L",
        sizeLabel: "L",
      }),
    ] as never);

    expect(result).toHaveLength(1);

    expect(
      result[0].entries.map(
        (entry) => entry.productSize.label
      )
    ).toEqual(["S", "M", "L"]);
  });

  it("ignores an unmapped product size", () => {
    const mapped = makeProductSize({
      productSizeId: "size-s",
      productSizeName: "S",
      sizeLabel: "S",
    });

    const unmapped = {
      ...makeProductSize({
        productSizeId: "size-m",
        productSizeName: "M",
        sizeLabel: "M",
      }),
      sizeChartMapping: null,
    };

    const result = presentProductSizeCharts([
      mapped,
      unmapped,
    ] as never);

    expect(result).toHaveLength(1);
    expect(result[0].entries).toHaveLength(1);
    expect(
      result[0].entries[0].productSize.label
    ).toBe("S");
  });

  it("does not merge different charts", () => {
    const result = presentProductSizeCharts([
      makeProductSize({
        productSizeId: "size-s",
        productSizeName: "S",
        chartId: "chart-a",
        chartName: "Chart A",
        sizeLabel: "S",
      }),
      makeProductSize({
        productSizeId: "size-m",
        productSizeName: "M",
        chartId: "chart-b",
        chartName: "Chart B",
        sizeLabel: "M",
      }),
    ] as never);

    expect(result).toHaveLength(2);
    expect(
      result.map((item) => item.chart.id)
    ).toEqual(["chart-a", "chart-b"]);
  });

  it("preserves measurement basis and source unit", () => {
    const result = presentProductSizeCharts([
      makeProductSize({
        productSizeId: "size-m",
        productSizeName: "M",
        sizeLabel: "M",
        sourceUnit: "IN",
        measurementBasis: "BODY",
      }),
    ] as never);

    expect(result[0].chart.sourceUnit).toBe("IN");
    expect(
      result[0].chart.measurementBasis
    ).toBe("BODY");
  });

  it("converts measurement values to plain numbers", () => {
    const result = presentProductSizeCharts([
      makeProductSize({
        productSizeId: "size-m",
        productSizeName: "M",
        sizeLabel: "M",
        measurements: [
          {
            type: "BUST",
            component: "DRESS",
            minValueCm: 90,
            maxValueCm: 94,
            sourceMinValue: 90,
            sourceMaxValue: 94,
          },
        ],
      }),
    ] as never);

    expect(
      result[0].entries[0].measurements[0]
    ).toMatchObject({
      type: "BUST",
      component: "DRESS",
      minValueCm: 90,
      maxValueCm: 94,
      sourceMinValue: 90,
      sourceMaxValue: 94,
    });
  });

  it("preserves null measurement bounds", () => {
    const result = presentProductSizeCharts([
      makeProductSize({
        productSizeId: "size-m",
        productSizeName: "M",
        sizeLabel: "M",
        measurements: [
          {
            type: "GARMENT_LENGTH",
            component: "DRESS",
          },
        ],
      }),
    ] as never);

    const measurement =
      result[0].entries[0].measurements[0];

    expect(measurement.minValueCm).toBeNull();
    expect(measurement.maxValueCm).toBeNull();
    expect(
      measurement.sourceMinValue
    ).toBeNull();
    expect(
      measurement.sourceMaxValue
    ).toBeNull();
  });

  it("preserves product size and brand chart labels separately", () => {
    const result = presentProductSizeCharts([
      makeProductSize({
        productSizeId: "size-small",
        productSizeName: "Small",
        sizeLabel: "S",
      }),
    ] as never);

    expect(
      result[0].entries[0].productSize.label
    ).toBe("Small");

    expect(
      result[0].entries[0].chartEntryLabel
    ).toBe("S");
  });
  it("orders chart entries by the brand chart sort order", () => {
  const small = makeProductSize({
    productSizeId: "size-s",
    productSizeName: "S",
    sizeLabel: "S",
  });

  const large = makeProductSize({
    productSizeId: "size-l",
    productSizeName: "L",
    sizeLabel: "L",
  });

  const medium = makeProductSize({
    productSizeId: "size-m",
    productSizeName: "M",
    sizeLabel: "M",
  });

  small.sizeChartMapping.chartEntry.sortOrder = 0;
  large.sizeChartMapping.chartEntry.sortOrder = 2;
  medium.sizeChartMapping.chartEntry.sortOrder = 1;

  const result = presentProductSizeCharts([
    small,
    large,
    medium,
  ] as never);

  expect(
    result[0].entries.map(
      (entry) => entry.productSize.label
    )
  ).toEqual(["S", "M", "L"]);
});
});