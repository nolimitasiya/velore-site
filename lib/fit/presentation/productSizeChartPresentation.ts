import type {
  StorefrontProductDetail,
} from "@/lib/storefront/product-detail";

type StorefrontProductSize =
  StorefrontProductDetail["productSizes"][number];

export type ProductSizeChartMeasurement = {
  type: string;
  component: string;

  minValueCm: number | null;
  maxValueCm: number | null;

  sourceMinValue: number | null;
  sourceMaxValue: number | null;
};

export type ProductSizeChartEntry = {
  id: string;
  sortOrder: number;


  productSize: {
    id: string;
    label: string;
  };

  chartEntryLabel: string;

  measurements: ProductSizeChartMeasurement[];
};

export type ProductSizeChartPresentation = {
  chart: {
    id: string;
    name: string;
    sourceUnit: string;
    measurementBasis: string;
    source: string;
    sourceUrl: string | null;
    lastVerifiedAt: Date | null;
  };

  entries: ProductSizeChartEntry[];
};

function toNumber(
  value:
    | { toString(): string }
    | number
    | string
    | null
    | undefined
): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value.toString());

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

export function presentProductSizeCharts(
  productSizes: StorefrontProductSize[]
): ProductSizeChartPresentation[] {
  const charts = new Map<
    string,
    ProductSizeChartPresentation
  >();

  for (const productSize of productSizes) {
    const mapping = productSize.sizeChartMapping;

    if (!mapping) {
      continue;
    }

    const entry = mapping.chartEntry;
    const chart = entry.chart;

    let presentedChart = charts.get(chart.id);

    if (!presentedChart) {
      presentedChart = {
        chart: {
          id: chart.id,
          name: chart.name,
          sourceUnit: chart.sourceUnit,
          measurementBasis:
            chart.measurementBasis,
          source: chart.source,
          sourceUrl: chart.sourceUrl,
          lastVerifiedAt:
            chart.lastVerifiedAt,
        },

        entries: [],
      };

      charts.set(
        chart.id,
        presentedChart
      );
    }

    presentedChart.entries.push({
  id: entry.id,
  sortOrder: entry.sortOrder,

  productSize: {
    id: productSize.size.id,
    label: productSize.size.name,
  },

  chartEntryLabel: entry.sizeLabel,

  measurements:
    entry.measurements.map(
      (measurement) => ({
        type: measurement.type,
        component: measurement.component,

        minValueCm: toNumber(
          measurement.minValueCm
        ),

        maxValueCm: toNumber(
          measurement.maxValueCm
        ),

        sourceMinValue: toNumber(
          measurement.sourceMinValue
        ),

        sourceMaxValue: toNumber(
          measurement.sourceMaxValue
        ),
      })
    ),
});
  }
  for (const chart of charts.values()) {
  chart.entries.sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}

  return Array.from(charts.values());
}