import {
  FabricStretch,
  FitDataSource,
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementType,
  ProductIntendedFit,
  ProductType,
} from "@prisma/client";

import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";
import { getProductMeasurementRules } from "@/lib/fit/measurementRules";

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

type SizingRequirementInput = {
  type: FitMeasurementType;
  component: FitGarmentComponent;
};

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
 * Product Fit components
 * -----------------------------
 */

if (!Array.isArray(input.fitComponents)) {
  return NextResponse.json(
    {
      error: "Fit components must be provided.",
    },
    {
      status: 400,
    }
  );
}

const fitComponents: FitGarmentComponent[] = [];

for (const rawComponent of input.fitComponents) {
  if (
    !isEnumValue(
      FitGarmentComponent,
      rawComponent
    )
  ) {
    return NextResponse.json(
      {
        error: "Invalid Fit component.",
      },
      {
        status: 400,
      }
    );
  }

  fitComponents.push(rawComponent);
}

if (
  new Set(fitComponents).size !==
  fitComponents.length
) {
  return NextResponse.json(
    {
      error:
        "A Fit component was submitted more than once.",
    },
    {
      status: 400,
    }
  );
}

/*
 * -----------------------------
 * Product sizing requirements
 * -----------------------------
 *
 * An empty array means this product has no explicit
 * override and should fall back to its canonical
 * product-type sizing requirements.
 */

if (!Array.isArray(input.sizingRequirements)) {
  return NextResponse.json(
    {
      error: "Sizing requirements must be provided.",
    },
    {
      status: 400,
    }
  );
}

const sizingRequirements: SizingRequirementInput[] = [];

for (const rawRequirement of input.sizingRequirements) {
  if (
    !rawRequirement ||
    typeof rawRequirement !== "object"
  ) {
    return NextResponse.json(
      {
        error: "Invalid sizing requirement.",
      },
      {
        status: 400,
      }
    );
  }

  const requirement =
    rawRequirement as Record<string, unknown>;

  if (
    !isEnumValue(
      FitMeasurementType,
      requirement.type
    ) ||
    !isEnumValue(
      FitGarmentComponent,
      requirement.component
    )
  ) {
    return NextResponse.json(
      {
        error: "Invalid sizing requirement.",
      },
      {
        status: 400,
      }
    );
  }

  sizingRequirements.push({
    type: requirement.type,
    component: requirement.component,
  });
}

const sizingRequirementKeys =
  sizingRequirements.map(
    (requirement) =>
      `${requirement.component}:${requirement.type}`
  );

if (
  new Set(sizingRequirementKeys).size !==
  sizingRequirementKeys.length
) {
  return NextResponse.json(
    {
      error:
        "A sizing requirement was submitted more than once.",
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
  slug: true,
  productType: true,

  brand: {
    select: {
      slug: true,
    },
  },

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
 * Product Fit composition
 * -----------------------------
 *
 * Composition is supported only for a single
 * canonical SETS or ACTIVEWEAR product.
 *
 * SETS:
 * - TOP + SKIRT
 * - TOP + TROUSER
 *
 * ACTIVEWEAR:
 * - TOP
 * - TROUSER
 * - TOP + TROUSER
 *
 * Every other product type must persist no
 * Fit components.
 */

const isCanonicalSetsProduct =
  canonicalProductTypes.length === 1 &&
  canonicalProductTypes[0] === ProductType.SETS;

const isCanonicalActivewearProduct =
  canonicalProductTypes.length === 1 &&
  canonicalProductTypes[0] ===
    ProductType.ACTIVEWEAR;

if (isCanonicalSetsProduct) {
  const componentSet = new Set(fitComponents);

  const isTopSkirt =
    componentSet.size === 2 &&
    componentSet.has(FitGarmentComponent.TOP) &&
    componentSet.has(FitGarmentComponent.SKIRT);

  const isTopTrouser =
    componentSet.size === 2 &&
    componentSet.has(FitGarmentComponent.TOP) &&
    componentSet.has(FitGarmentComponent.TROUSER);

  if (!isTopSkirt && !isTopTrouser) {
    return NextResponse.json(
      {
        error:
          "SETS products must use a supported composition: Top + Skirt or Top + Trouser.",
      },
      {
        status: 400,
      }
    );
  }
} else if (isCanonicalActivewearProduct) {
  const componentSet = new Set(fitComponents);

  const isTop =
    componentSet.size === 1 &&
    componentSet.has(FitGarmentComponent.TOP);

  const isTrouser =
    componentSet.size === 1 &&
    componentSet.has(
      FitGarmentComponent.TROUSER
    );

  const isTopTrouser =
    componentSet.size === 2 &&
    componentSet.has(FitGarmentComponent.TOP) &&
    componentSet.has(
      FitGarmentComponent.TROUSER
    );

  if (
    !isTop &&
    !isTrouser &&
    !isTopTrouser
  ) {
    return NextResponse.json(
      {
        error:
          "ACTIVEWEAR products must use a supported composition: Top, Trouser, or Top + Trouser.",
      },
      {
        status: 400,
      }
    );
  }
} else if (fitComponents.length > 0) {
  return NextResponse.json(
    {
      error:
        "Fit components can only be configured for a SETS or ACTIVEWEAR product.",
    },
    {
      status: 400,
    }
  );
}

/*
 * -----------------------------
 * Sizing requirement integrity
 * -----------------------------
 *
 * Explicit product requirements may only use BODY
 * sizing dimensions supported by the canonical
 * measurement rules for this exact product structure.
 *
 * Length and coverage measurements are intentionally
 * excluded.
 */

if (sizingRequirements.length > 0) {
  if (canonicalProductTypes.length !== 1) {
    return NextResponse.json(
      {
        error:
          "Product-specific sizing requirements require exactly one canonical product type.",
      },
      {
        status: 400,
      }
    );
  }

  const measurementRules =
    getProductMeasurementRules(
      canonicalProductTypes[0],
      fitComponents
    );

  if (!measurementRules.supportsSizeRecommendation) {
    return NextResponse.json(
      {
        error:
          "Product-specific sizing requirements are not supported for this product.",
      },
      {
        status: 400,
      }
    );
  }

  const allowedRequirements = [
    ...measurementRules.requiredBodyFit,
    ...measurementRules.optionalBodyFit,
  ];

  const allowedRequirementKeys = new Set(
    allowedRequirements.flatMap((requirement) =>
      requirement.component
        ? [
            `${requirement.component}:${requirement.type}`,
          ]
        : []
    )
  );

  for (const requirement of sizingRequirements) {
    const key =
      `${requirement.component}:${requirement.type}`;

    if (!allowedRequirementKeys.has(key)) {
      return NextResponse.json(
        {
          error:
            "A sizing requirement is not valid for this product type and garment component.",
        },
        {
          status: 400,
        }
      );
    }
  }
}

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
    const fitProfile =
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
 * The Product Fit editor represents the complete
 * component state for this product.
 *
 * Replace the normalized component rows atomically.
 */
await tx.productFitComponent.deleteMany({
  where: {
    fitProfileId: fitProfile.id,
  },
});

if (fitComponents.length > 0) {
  await tx.productFitComponent.createMany({
    data: fitComponents.map((component) => ({
      fitProfileId: fitProfile.id,
      component,
    })),
  });
}

/*
 * The Product Fit editor represents the complete
 * explicit sizing-requirement state for this product.
 *
 * No rows means there is no product-specific override,
 * so the recommendation engine falls back to the
 * canonical product-type requirements.
 *
 * One or more rows means those BODY measurements are
 * the authoritative requirements for this product.
 */
await tx.productFitSizingRequirement.deleteMany({
  where: {
    fitProfileId: fitProfile.id,
  },
});

if (sizingRequirements.length > 0) {
  await tx.productFitSizingRequirement.createMany({
    data: sizingRequirements.map((requirement) => ({
      fitProfileId: fitProfile.id,
      type: requirement.type,
      component: requirement.component,
    })),
  });
}

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

revalidateTag(
  `product:${product.brand.slug}:${product.slug}`,
  "max"
);

revalidateTag(
  `brand:${product.brand.slug}`,
  "max"
);

revalidateTag("storefront-products", "max");

  return NextResponse.json({
    ok: true,
    mappedSizeCount: mappedRows.length,
    catalogueSizeCount:
      product.productSizes.length,
  });
}