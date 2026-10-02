import {
  FitGarmentComponent,
  FitMeasurementType,
  FitUnit,
  Prisma,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RawMeasurement = {
  type?: unknown;
  component?: unknown;
  minValue?: unknown;
  maxValue?: unknown;
};

type RawEntry = {
   entryId?: unknown;
  sizeLabel?: unknown;
  measurements?: unknown;
};

function isEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: unknown
): value is T[keyof T] {
  return (
    typeof value === "string" &&
    Object.values(enumObject).includes(value as T[keyof T])
  );
}

function parseDecimal(value: unknown): number | null {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return null;
  }

  const trimmed = String(value).trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function toCentimetres(
  value: number,
  sourceUnit: FitUnit
): number {
  if (sourceUnit === FitUnit.IN) {
    return value * 2.54;
  }

  return value;
}

function decimal(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

export async function PUT(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ chartId: string }>;
  }
) {
  await requireAdminSession();

  const { chartId } = await params;

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid request.",
      },
      { status: 400 }
    );
  }

  const chart = await prisma.brandSizeChart.findUnique({
    where: {
      id: chartId,
    },

    select: {
      id: true,
      sourceUnit: true,
    },
  });

  if (!chart) {
    return NextResponse.json(
      {
        ok: false,
        error: "Size chart not found.",
      },
      { status: 404 }
    );
  }

  const rawEntries: RawEntry[] = Array.isArray(body.entries)
    ? body.entries
    : [];

  if (rawEntries.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Add at least one size row.",
      },
      { status: 400 }
    );
  }

  const preparedEntries: Array<{
    entryId: string | null;
    sizeLabel: string;
    sortOrder: number;
    measurements: Array<{
      type: FitMeasurementType;
      component: FitGarmentComponent;
      sourceMinValue: number;
      sourceMaxValue: number;
      minValueCm: number;
      maxValueCm: number;
    }>;
  }> = [];

  const seenSizeLabels = new Set<string>();
  const seenEntryIds = new Set<string>();

  for (
    let entryIndex = 0;
    entryIndex < rawEntries.length;
    entryIndex += 1
  ) {
    const rawEntry = rawEntries[entryIndex];

const entryId =
  typeof rawEntry.entryId === "string" &&
  rawEntry.entryId.trim()
    ? rawEntry.entryId.trim()
    : null;

if (entryId) {
  if (seenEntryIds.has(entryId)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "The same size-chart entry was submitted more than once.",
      },
      { status: 400 }
    );
  }

  seenEntryIds.add(entryId);
}

const sizeLabel =
  typeof rawEntry.sizeLabel === "string"
    ? rawEntry.sizeLabel.trim()
    : "";

    if (!sizeLabel) {
      return NextResponse.json(
        {
          ok: false,
          error: `Size row ${entryIndex + 1} needs a label.`,
        },
        { status: 400 }
      );
    }

    const normalizedSizeLabel = sizeLabel.toLowerCase();

    if (seenSizeLabels.has(normalizedSizeLabel)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Duplicate size label: ${sizeLabel}.`,
        },
        { status: 400 }
      );
    }

    seenSizeLabels.add(normalizedSizeLabel);

    const rawMeasurements: RawMeasurement[] =
      Array.isArray(rawEntry.measurements)
        ? rawEntry.measurements
        : [];

    const preparedMeasurements: Array<{
      type: FitMeasurementType;
      component: FitGarmentComponent;
      sourceMinValue: number;
      sourceMaxValue: number;
      minValueCm: number;
      maxValueCm: number;
    }> = [];

    const seenMeasurements = new Set<string>();

    for (
      let measurementIndex = 0;
      measurementIndex < rawMeasurements.length;
      measurementIndex += 1
    ) {
      const rawMeasurement =
        rawMeasurements[measurementIndex];

      if (
        !isEnumValue(
          FitMeasurementType,
          rawMeasurement.type
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: `Invalid measurement type in size ${sizeLabel}.`,
          },
          { status: 400 }
        );
      }

      if (
        !isEnumValue(
          FitGarmentComponent,
          rawMeasurement.component
        )
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: `Invalid garment component in size ${sizeLabel}.`,
          },
          { status: 400 }
        );
      }

      const sourceMinValue = parseDecimal(
        rawMeasurement.minValue
      );

      const parsedMaxValue = parseDecimal(
        rawMeasurement.maxValue
      );

      if (sourceMinValue === null) {
        return NextResponse.json(
          {
            ok: false,
            error: `Enter a valid minimum value for ${rawMeasurement.type} in size ${sizeLabel}.`,
          },
          { status: 400 }
        );
      }

      const sourceMaxValue =
        parsedMaxValue ?? sourceMinValue;

      if (sourceMaxValue < sourceMinValue) {
        return NextResponse.json(
          {
            ok: false,
            error: `Maximum value cannot be lower than minimum value for ${rawMeasurement.type} in size ${sizeLabel}.`,
          },
          { status: 400 }
        );
      }

      const measurementKey =
        `${rawMeasurement.type}:${rawMeasurement.component}`;

      if (seenMeasurements.has(measurementKey)) {
        return NextResponse.json(
          {
            ok: false,
            error: `Duplicate ${rawMeasurement.type} measurement for ${rawMeasurement.component} in size ${sizeLabel}.`,
          },
          { status: 400 }
        );
      }

      seenMeasurements.add(measurementKey);

      preparedMeasurements.push({
        type: rawMeasurement.type,
        component: rawMeasurement.component,
        sourceMinValue,
        sourceMaxValue,

        minValueCm: toCentimetres(
          sourceMinValue,
          chart.sourceUnit
        ),

        maxValueCm: toCentimetres(
          sourceMaxValue,
          chart.sourceUnit
        ),
      });
    }

    preparedEntries.push({
      entryId,
      sizeLabel,
      sortOrder: entryIndex,
      measurements: preparedMeasurements,
    });
  }

try {
  await prisma.$transaction(async (tx) => {
  /*
   * Existing chart-entry IDs are permanent identities.
   *
   * Products may reference BrandSizeChartEntry through
   * ProductSizeChartMapping, so normal chart editing must
   * never replace an existing entry merely because its
   * label, order or measurements changed.
   */

  const existingEntries =
    await tx.brandSizeChartEntry.findMany({
      where: {
        chartId,
      },

      select: {
        id: true,
        sizeLabel: true,

        productSizeMappings: {
          select: {
            productId: true,
            sizeId: true,
          },

          take: 1,
        },
      },
    });

  const existingEntryIds = new Set(
    existingEntries.map((entry) => entry.id)
  );

  /*
   * Security / integrity:
   * every submitted persisted ID must genuinely belong
   * to the chart being edited.
   */
  for (const entry of preparedEntries) {
    if (
      entry.entryId &&
      !existingEntryIds.has(entry.entryId)
    ) {
      throw new Error(
        `Size-chart entry ${entry.entryId} does not belong to this chart.`
      );
    }
  }

  const submittedExistingIds = new Set(
    preparedEntries
      .map((entry) => entry.entryId)
      .filter((id): id is string => Boolean(id))
  );

  /*
   * An existing DB row omitted from the submitted matrix
   * represents an intentional deletion.
   *
   * Never delete it if a ProductSize currently maps to it.
   */
  const entriesToDelete = existingEntries.filter(
    (entry) => !submittedExistingIds.has(entry.id)
  );

  const mappedEntryToDelete = entriesToDelete.find(
    (entry) => entry.productSizeMappings.length > 0
  );

  if (mappedEntryToDelete) {
    throw new Error(
      `Cannot remove size "${mappedEntryToDelete.sizeLabel}" because one or more products are mapped to it. Remove or change those product mappings first.`
    );
  }

  /*
   * Delete only genuinely removed, unreferenced entries.
   */
  if (entriesToDelete.length > 0) {
    await tx.brandSizeChartEntry.deleteMany({
      where: {
        chartId,

        id: {
          in: entriesToDelete.map(
            (entry) => entry.id
          ),
        },
      },
    });
  }

  /*
   * Reconcile submitted rows.
   */
  for (const entry of preparedEntries) {
    if (entry.entryId) {
      /*
       * Preserve the BrandSizeChartEntry ID.
       */
      await tx.brandSizeChartEntry.update({
        where: {
          id: entry.entryId,
        },

        data: {
          sizeLabel: entry.sizeLabel,
          sortOrder: entry.sortOrder,
        },
      });

      /*
       * Individual measurement IDs are not referenced
       * elsewhere, so the measurements beneath this
       * stable chart entry can safely be replaced.
       */
      await tx.brandSizeChartMeasurement.deleteMany({
        where: {
          entryId: entry.entryId,
        },
      });

      if (entry.measurements.length > 0) {
        await tx.brandSizeChartMeasurement.createMany({
          data: entry.measurements.map(
            (measurement) => ({
              entryId: entry.entryId!,

              type: measurement.type,
              component: measurement.component,

              minValueCm: decimal(
                measurement.minValueCm
              ),

              maxValueCm: decimal(
                measurement.maxValueCm
              ),

              sourceMinValue: decimal(
                measurement.sourceMinValue
              ),

              sourceMaxValue: decimal(
                measurement.sourceMaxValue
              ),

              sourceUnit: chart.sourceUnit,
            })
          ),
        });
      }

      continue;
    }

    /*
     * No entryId means this is genuinely a new size row.
     */
    await tx.brandSizeChartEntry.create({
      data: {
        chartId,
        sizeLabel: entry.sizeLabel,
        sortOrder: entry.sortOrder,

        measurements: {
          create: entry.measurements.map(
            (measurement) => ({
              type: measurement.type,
              component: measurement.component,

              minValueCm: decimal(
                measurement.minValueCm
              ),

              maxValueCm: decimal(
                measurement.maxValueCm
              ),

              sourceMinValue: decimal(
                measurement.sourceMinValue
              ),

              sourceMaxValue: decimal(
                measurement.sourceMaxValue
              ),

              sourceUnit: chart.sourceUnit,
            })
          ),
        },
      },
    });
  }
});
} catch (error) {
  const message =
    error instanceof Error
      ? error.message
      : "Unable to save size chart.";

  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status: 400 }
  );
}

  const measurementCount = preparedEntries.reduce(
    (total, entry) =>
      total + entry.measurements.length,
    0
  );

  return NextResponse.json({
    ok: true,
    sizeCount: preparedEntries.length,
    measurementCount,
  });
}