import {
  FabricStretch,
  FitDataSource,
  FitMeasurementBasis,
  ProductIntendedFit,
  ProductType,
} from "@prisma/client";

import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";

function isEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: unknown
): value is T[keyof T] {
  return (
    typeof value === "string" &&
    Object.values(enumObject).includes(value)
  );
}

function parseOptionalDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const date = new Date(`${value}T12:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function parseOptionalUrl(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return undefined;
    }

    return trimmed;
  } catch {
    return undefined;
  }
}

type MappingInput = {
  sizeId: string;
  entryId: string | null;
};

export async function PUT(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ productId: string }>;
  }
) {
  await requireAdminSession();

  const { productId } = await params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request body.",
      },
      {
        status: 400,
      }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      {
        error: "Invalid request body.",
      },
      {
        status: 400,
      }
    );
  }

  const input = body as Record<string, unknown>;

  /*
   * -----------------------------
   * Product Fit profile validation
   * -----------------------------
   */

  const intendedFit =
    input.intendedFit === null ||
    input.intendedFit === ""
      ? null
      : isEnumValue(
            ProductIntendedFit,
            input.intendedFit
          )
        ? input.intendedFit
        : undefined;

  if (intendedFit === undefined) {
    return NextResponse.json(
      {
        error: "Invalid intended fit.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !isEnumValue(FabricStretch, input.stretch)
  ) {
    return NextResponse.json(
      {
        error: "Invalid fabric stretch.",
      },
      {
        status: 400,
      }
    );
  }

  const stretch = input.stretch;

  if (
    !isEnumValue(
      FitMeasurementBasis,
      input.measurementBasis
    )
  ) {
    return NextResponse.json(
      {
        error: "Invalid measurement basis.",
      },
      {
        status: 400,
      }
    );
  }

  const measurementBasis = input.measurementBasis;

  const source =
    input.source === null || input.source === ""
      ? null
      : isEnumValue(FitDataSource, input.source)
        ? input.source
        : undefined;

  if (source === undefined) {
    return NextResponse.json(
      {
        error: "Invalid Fit data source.",
      },
      {
        status: 400,
      }
    );
  }

  const sourceUrl = parseOptionalUrl(
    input.sourceUrl
  );

  if (sourceUrl === undefined) {
    return NextResponse.json(
      {
        error:
          "Source URL must be a valid HTTP or HTTPS URL.",
      },
      {
        status: 400,
      }
    );
  }

  const fitNotes =
    typeof input.fitNotes === "string"
      ? input.fitNotes.trim()
      : "";

  const lastVerifiedAt = parseOptionalDate(
    input.lastVerifiedAt
  );

  if (lastVerifiedAt === undefined) {
    return NextResponse.json(
      {
        error: "Invalid verification date.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * -----------------------------
   * Chart + mapping input
   * -----------------------------
   */

  const chartId =
    typeof input.chartId === "string" &&
    input.chartId.trim()
      ? input.chartId.trim()
      : null;

  if (!Array.isArray(input.mappings)) {
    return NextResponse.json(
      {
        error: "Mappings must be provided.",
      },
      {
        status: 400,
      }
    );
  }

  const mappings: MappingInput[] = [];

  for (const rawMapping of input.mappings) {
    if (
      !rawMapping ||
      typeof rawMapping !== "object"
    ) {
      return NextResponse.json(
        {
          error: "Invalid size mapping.",
        },
        {
          status: 400,
        }
      );
    }

    const mapping =
      rawMapping as Record<string, unknown>;

    if (
      typeof mapping.sizeId !== "string" ||
      !mapping.sizeId.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Every mapping must contain a size.",
        },
        {
          status: 400,
        }
      );
    }

    const entryId =
      mapping.entryId === null ||
      mapping.entryId === ""
        ? null
        : typeof mapping.entryId === "string"
          ? mapping.entryId.trim()
          : undefined;

    if (entryId === undefined) {
      return NextResponse.json(
        {
          error: "Invalid chart entry mapping.",
        },
        {
          status: 400,
        }
      );
    }

    mappings.push({
      sizeId: mapping.sizeId.trim(),
      entryId: entryId || null,
    });
  }

  /*
   * Do not allow duplicate ProductSize rows
   * in the submitted payload.
   */
  const submittedSizeIds = mappings.map(
    (mapping) => mapping.sizeId
  );

  if (
    new Set(submittedSizeIds).size !==
    submittedSizeIds.length
  ) {
    return NextResponse.json(
      {
        error:
          "A product size was submitted more than once.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * -----------------------------
   * Load authoritative product data
   * -----------------------------
   */

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },

    select: {
      id: true,
      brandId: true,
      productType: true,

      productTypes: {
        select: {
          productType: true,
        },
      },

      productSizes: {
        select: {
          sizeId: true,
        },
      },
    },
  });

  if (!product) {
    return NextResponse.json(
      {
        error: "Product not found.",
      },
      {
        status: 404,
      }
    );
  }

  /*
   * ProductProductType is canonical.
   * Legacy productType is only a fallback.
   */
  const canonicalProductTypes: ProductType[] = [
    ...new Set<ProductType>([
      ...product.productTypes.map(
        (item) => item.productType
      ),

      ...(product.productTypes.length === 0 &&
      product.productType
        ? [product.productType]
        : []),
    ]),
  ];

  /*
   * -----------------------------
   * Integrity check:
   * submitted ProductSizes must actually
   * belong to this product.
   * -----------------------------
   */

  const realSizeIds = new Set(
    product.productSizes.map(
      (productSize) => productSize.sizeId
    )
  );

  if (
    mappings.length !==
    product.productSizes.length
  ) {
    return NextResponse.json(
      {
        error:
          "The submitted mappings do not match this product's catalogue sizes.",
      },
      {
        status: 400,
      }
    );
  }

  for (const mapping of mappings) {
    if (!realSizeIds.has(mapping.sizeId)) {
      return NextResponse.json(
        {
          error:
            "A submitted size does not belong to this product.",
        },
        {
          status: 400,
        }
      );
    }
  }

  /*
   * -----------------------------
   * Chart integrity
   * -----------------------------
   */

  let validChartEntryIds = new Set<string>();

  if (chartId) {
    const chart =
      await prisma.brandSizeChart.findUnique({
        where: {
          id: chartId,
        },

        select: {
          id: true,
          brandId: true,
          isActive: true,

          productTypes: {
            select: {
              productType: true,
            },
          },

          entries: {
            select: {
              id: true,
            },
          },
        },
      });

    if (!chart || !chart.isActive) {
      return NextResponse.json(
        {
          error:
            "The selected size chart is not available.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Integrity rule 1:
     * chart belongs to product brand.
     */
    if (chart.brandId !== product.brandId) {
      return NextResponse.json(
        {
          error:
            "The selected size chart does not belong to this product's brand.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Integrity rule 2:
     * chart applies to at least one of the
     * product's canonical ProductTypes.
     */
    const chartProductTypes = new Set(
      chart.productTypes.map(
        (item) => item.productType
      )
    );

    const typeCompatible =
      canonicalProductTypes.some(
        (productType) =>
          chartProductTypes.has(productType)
      );

    if (!typeCompatible) {
      return NextResponse.json(
        {
          error:
            "The selected size chart is not compatible with this product type.",
        },
        {
          status: 400,
        }
      );
    }

    validChartEntryIds = new Set(
      chart.entries.map((entry) => entry.id)
    );

    /*
     * Integrity rule 3:
     * every selected entry belongs to this
     * exact chart.
     */
    for (const mapping of mappings) {
      if (
        mapping.entryId &&
        !validChartEntryIds.has(mapping.entryId)
      ) {
        return NextResponse.json(
          {
            error:
              "A selected size row does not belong to the selected size chart.",
          },
          {
            status: 400,
          }
        );
      }
    }
  } else {
    /*
     * A mapping cannot exist without a chart.
     */
    if (
      mappings.some(
        (mapping) => mapping.entryId !== null
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Choose a size chart before mapping product sizes.",
        },
        {
          status: 400,
        }
      );
    }
  }

  /*
   * -----------------------------
   * Persist atomically
   * -----------------------------
   */

  const mappedRows = mappings.filter(
    (
      mapping
    ): mapping is {
      sizeId: string;
      entryId: string;
    } => mapping.entryId !== null
  );

  await prisma.$transaction(async (tx) => {
    /*
     * Product Fit profile:
     * create once, update thereafter.
     */
    await tx.productFitProfile.upsert({
      where: {
        productId,
      },

      create: {
        productId,
        intendedFit,
        stretch,
        measurementBasis,
        source,
        sourceUrl: sourceUrl || null,
        fitNotes: fitNotes || null,
        lastVerifiedAt,
      },

      update: {
        intendedFit,
        stretch,
        measurementBasis,
        source,
        sourceUrl: sourceUrl || null,
        fitNotes: fitNotes || null,
        lastVerifiedAt,
      },
    });

    /*
     * The submitted editor represents the
     * complete mapping state for this product.
     *
     * Clear existing mappings, then recreate
     * only the rows currently selected.
     */
    await tx.productSizeChartMapping.deleteMany({
      where: {
        productId,
      },
    });

    if (mappedRows.length > 0) {
      await tx.productSizeChartMapping.createMany({
        data: mappedRows.map((mapping) => ({
          productId,
          sizeId: mapping.sizeId,
          entryId: mapping.entryId,
        })),
      });
    }
  });

  return NextResponse.json({
    ok: true,
    mappedSizeCount: mappedRows.length,
    catalogueSizeCount:
      product.productSizes.length,
  });
}