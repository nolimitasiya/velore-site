import {
  FitGarmentComponent,
  FitMeasurementBasis,
  FitMeasurementType,
  FitUnit,
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

function parseNumber(value: unknown) {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return undefined;
  }

  if (
    typeof value === "string" &&
    value.trim() === ""
  ) {
    return undefined;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return undefined;
  }

  return number;
}

function toCm(value: number, unit: FitUnit) {
  return unit === FitUnit.IN
    ? value * 2.54
    : value;
}

function decimalValue(value: number) {
  return Number(value.toFixed(2));
}
const ONE_SIZE_PRODUCT_TYPES = new Set<ProductType>([
  ProductType.HIJAB,
  ProductType.KHIMAR,
]);

const ONE_SIZE_COMPONENTS: Partial<
  Record<ProductType, FitGarmentComponent>
> = {
  [ProductType.HIJAB]: FitGarmentComponent.HIJAB,
  [ProductType.KHIMAR]: FitGarmentComponent.KHIMAR,
};

const ONE_SIZE_MEASUREMENT_TYPES: Partial<
  Record<
    ProductType,
    ReadonlySet<FitMeasurementType>
  >
> = {
  [ProductType.HIJAB]: new Set([
    FitMeasurementType.GARMENT_LENGTH,
    FitMeasurementType.WIDTH,
  ]),

  [ProductType.KHIMAR]: new Set([
    FitMeasurementType.GARMENT_LENGTH,
    FitMeasurementType.FRONT_LENGTH,
    FitMeasurementType.BACK_LENGTH,
    FitMeasurementType.WIDTH,
  ]),
};

type ParsedMeasurement = {
  type: FitMeasurementType;
  component: FitGarmentComponent;
  sourceUnit: FitUnit;
  sourceMinValue: number;
  sourceMaxValue: number;
  minValueCm: number;
  maxValueCm: number;
};

type ParsedSizeMeasurement =
  ParsedMeasurement & {
    sizeId: string;
    measurementBasis: FitMeasurementBasis | null;
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
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const input = body as Record<string, unknown>;

  if (
    !Array.isArray(input.productMeasurements) ||
    !Array.isArray(input.sizeMeasurements)
  ) {
    return NextResponse.json(
      {
        error:
          "Product and size measurements must be provided.",
      },
      { status: 400 }
    );
  }

  /*
   * The ProductFitProfile must already exist.
   *
   * Measurements augment an existing Fit profile;
   * this endpoint does not silently create one.
   */
  const product =
    await prisma.product.findUnique({
      where: {
        id: productId,
      },

      select: {
  id: true,
  productType: true,

  productTypes: {
    select: {
      productType: true,
    },
  },

  fitProfile: {
    select: {
      id: true,
      measurementBasis: true,
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
      { error: "Product not found." },
      { status: 404 }
    );
  }

  if (!product.fitProfile) {
    return NextResponse.json(
      {
        error:
          "Configure Product Fit before adding product-specific measurements.",
      },
      { status: 400 }
    );
  }

  const canonicalProductTypes = [
  ...new Set(
    product.productTypes.map(
      (item) => item.productType
    )
  ),
];

const effectiveProductTypes =
  canonicalProductTypes.length > 0
    ? canonicalProductTypes
    : product.productType
      ? [product.productType]
      : [];

const oneSizeProductType =
  effectiveProductTypes.length === 1 &&
  ONE_SIZE_PRODUCT_TYPES.has(
    effectiveProductTypes[0]
  )
    ? effectiveProductTypes[0]
    : null;

const isOneSizeProduct =
  oneSizeProductType !== null;

  if (
  isOneSizeProduct &&
  product.fitProfile.measurementBasis !==
    FitMeasurementBasis.GARMENT
) {
  return NextResponse.json(
    {
      error:
        "One Size Hijab and Khimar dimensions require a Garment measurement basis.",
    },
    { status: 400 }
  );
}
if (
  isOneSizeProduct &&
  input.sizeMeasurements.length > 0
) {
  return NextResponse.json(
    {
      error:
        "One Size Hijab and Khimar products cannot have size-specific Fit measurements.",
    },
    { status: 400 }
  );
}

  const realSizeIds = new Set(
    product.productSizes.map(
      (productSize) => productSize.sizeId
    )
  );

  /*
   * -----------------------------
   * Product-level measurements
   * -----------------------------
   */

  const productMeasurements: ParsedMeasurement[] =
    [];

  const productSemanticKeys = new Set<string>();

  for (const raw of input.productMeasurements) {
    if (!raw || typeof raw !== "object") {
      return NextResponse.json(
        {
          error:
            "Invalid product-level measurement.",
        },
        { status: 400 }
      );
    }

    const measurement =
      raw as Record<string, unknown>;

    if (
      !isEnumValue(
        FitMeasurementType,
        measurement.type
      ) ||
      !isEnumValue(
        FitGarmentComponent,
        measurement.component
      ) ||
      !isEnumValue(
        FitUnit,
        measurement.sourceUnit
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid product-level measurement type, component or unit.",
        },
        { status: 400 }
      );
    }

if (
  oneSizeProductType !== null
) {
  const expectedComponent =
    ONE_SIZE_COMPONENTS[
      oneSizeProductType
    ];

  const allowedMeasurementTypes =
    ONE_SIZE_MEASUREMENT_TYPES[
      oneSizeProductType
    ];

  if (
    measurement.component !==
      expectedComponent ||
    !allowedMeasurementTypes?.has(
      measurement.type
    )
  ) {
    return NextResponse.json(
      {
        error:
          oneSizeProductType ===
          ProductType.HIJAB
            ? "One Size Hijab measurements must use the Hijab component and supported Hijab dimensions."
            : "One Size Khimar measurements must use the Khimar component and supported Khimar dimensions.",
      },
      { status: 400 }
    );
  }
}


    const sourceMinValue = parseNumber(
      measurement.sourceMinValue
    );

    /*
     * Blank max means a single source value.
     */
    const rawMax =
      measurement.sourceMaxValue;

    const sourceMaxValue =
      rawMax === "" ||
      rawMax === null ||
      rawMax === undefined
        ? sourceMinValue
        : parseNumber(rawMax);

    if (
      sourceMinValue === undefined ||
      sourceMaxValue === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Every product-level measurement requires a valid value.",
        },
        { status: 400 }
      );
    }

    if (
  isOneSizeProduct &&
  (sourceMinValue <= 0 ||
    sourceMaxValue <= 0)
) {
  return NextResponse.json(
    {
      error:
        "One Size product dimensions must be greater than zero.",
    },
    { status: 400 }
  );
}

    if (sourceMaxValue < sourceMinValue) {
      return NextResponse.json(
        {
          error:
            "A product-level range maximum cannot be lower than its value.",
        },
        { status: 400 }
      );
    }



    const semanticKey =
      `${measurement.type}:${measurement.component}`;

    if (productSemanticKeys.has(semanticKey)) {
      return NextResponse.json(
        {
          error:
            "A product-level measurement is duplicated.",
        },
        { status: 400 }
      );
    }

    productSemanticKeys.add(semanticKey);

    productMeasurements.push({
      type: measurement.type,
      component: measurement.component,
      sourceUnit: measurement.sourceUnit,
      sourceMinValue:
        decimalValue(sourceMinValue),
      sourceMaxValue:
        decimalValue(sourceMaxValue),
      minValueCm: decimalValue(
        toCm(
          sourceMinValue,
          measurement.sourceUnit
        )
      ),
      maxValueCm: decimalValue(
        toCm(
          sourceMaxValue,
          measurement.sourceUnit
        )
      ),
    });
  }

  /*
   * -----------------------------
   * Size-specific measurements
   * -----------------------------
   */

  const sizeMeasurements: ParsedSizeMeasurement[] =
    [];

  const sizeSemanticKeys = new Set<string>();

  for (const raw of input.sizeMeasurements) {
    if (!raw || typeof raw !== "object") {
      return NextResponse.json(
        {
          error:
            "Invalid size-specific measurement.",
        },
        { status: 400 }
      );
    }

   const measurement =
  raw as Record<string, unknown>;

if (
  typeof measurement.sizeId !== "string" ||
  !realSizeIds.has(measurement.sizeId)
) {
  return NextResponse.json(
    {
      error:
        "A size-specific measurement references a size that does not belong to this product.",
    },
    { status: 400 }
  );
}

/*
 * A null/omitted basis means:
 * inherit ProductFitProfile.measurementBasis.
 *
 * Otherwise it must be an explicit valid basis.
 */
if (
  measurement.measurementBasis !== null &&
  measurement.measurementBasis !== undefined &&
  !isEnumValue(
    FitMeasurementBasis,
    measurement.measurementBasis
  )
) {
  return NextResponse.json(
    {
      error:
        "Invalid size-specific measurement basis.",
    },
    { status: 400 }
  );
}

if (
  !isEnumValue(
    FitMeasurementType,
    measurement.type
  ) ||
  !isEnumValue(
    FitGarmentComponent,
    measurement.component
  ) ||
  !isEnumValue(
    FitUnit,
    measurement.sourceUnit
  )
) {
  return NextResponse.json(
    {
      error:
        "Invalid size-specific measurement type, component or unit.",
    },
    { status: 400 }
  );
}


    const sourceMinValue = parseNumber(
      measurement.sourceMinValue
    );

    const rawMax =
      measurement.sourceMaxValue;

    const sourceMaxValue =
      rawMax === "" ||
      rawMax === null ||
      rawMax === undefined
        ? sourceMinValue
        : parseNumber(rawMax);

    if (
      sourceMinValue === undefined ||
      sourceMaxValue === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Every size-specific measurement requires a valid value.",
        },
        { status: 400 }
      );
    }

    if (sourceMaxValue < sourceMinValue) {
      return NextResponse.json(
        {
          error:
            "A size-specific range maximum cannot be lower than its value.",
        },
        { status: 400 }
      );
    }

    const semanticKey =
      `${measurement.sizeId}:${measurement.type}:${measurement.component}`;

    if (sizeSemanticKeys.has(semanticKey)) {
      return NextResponse.json(
        {
          error:
            "A size-specific measurement is duplicated.",
        },
        { status: 400 }
      );
    }

    sizeSemanticKeys.add(semanticKey);

    sizeMeasurements.push({
  sizeId: measurement.sizeId,
  type: measurement.type,
  component: measurement.component,
  measurementBasis:
    measurement.measurementBasis === undefined
      ? null
      : measurement.measurementBasis,
  sourceUnit: measurement.sourceUnit,
      sourceMinValue:
        decimalValue(sourceMinValue),
      sourceMaxValue:
        decimalValue(sourceMaxValue),
      minValueCm: decimalValue(
        toCm(
          sourceMinValue,
          measurement.sourceUnit
        )
      ),
      maxValueCm: decimalValue(
        toCm(
          sourceMaxValue,
          measurement.sourceUnit
        )
      ),
    });
  }

  /*
   * -----------------------------
   * Persist atomically
   * -----------------------------
   *
   * The submitted editor represents the
   * complete product-specific measurement
   * state for this ProductFitProfile.
   */

  await prisma.$transaction(async (tx) => {
    await tx.productFitMeasurement.deleteMany({
      where: {
        fitProfileId: product.fitProfile!.id,
      },
    });

    await tx.productSizeFitMeasurement.deleteMany({
      where: {
        fitProfileId: product.fitProfile!.id,
      },
    });

    if (productMeasurements.length > 0) {
      await tx.productFitMeasurement.createMany({
        data: productMeasurements.map(
          (measurement) => ({
            fitProfileId:
              product.fitProfile!.id,

            type: measurement.type,
            component: measurement.component,

            minValueCm:
              measurement.minValueCm,
            maxValueCm:
              measurement.maxValueCm,

            sourceMinValue:
              measurement.sourceMinValue,
            sourceMaxValue:
              measurement.sourceMaxValue,
            sourceUnit:
              measurement.sourceUnit,
          })
        ),
      });
    }

    if (sizeMeasurements.length > 0) {
      await tx.productSizeFitMeasurement.createMany({
        data: sizeMeasurements.map(
          (measurement) => ({
            fitProfileId:
              product.fitProfile!.id,

            productId,
            sizeId: measurement.sizeId,

            type: measurement.type,
            component: measurement.component,
            measurementBasis:
              measurement.measurementBasis,
            minValueCm:
              measurement.minValueCm,
            maxValueCm:
              measurement.maxValueCm,

            sourceMinValue:
              measurement.sourceMinValue,
            sourceMaxValue:
              measurement.sourceMaxValue,
            sourceUnit:
              measurement.sourceUnit,
          })
        ),
      });
    }
  });

  return NextResponse.json({
    ok: true,
    productMeasurementCount:
      productMeasurements.length,
    sizeMeasurementCount:
      sizeMeasurements.length,
  });
}
