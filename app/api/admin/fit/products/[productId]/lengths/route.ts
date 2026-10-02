import {
  FitDataSource,
  FitUnit,
  ProductLengthStructure,
} from "@prisma/client";

import { NextRequest, NextResponse } from "next/server";
import { normalizeLengthToCm } from "@/lib/fit/productLengthNormalization";

import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

type LengthOptionInput = {
  id?: string | null;
  label?: unknown;
  sourceValue?: unknown;
  sourceUnit?: unknown;
  sortOrder?: unknown;
  source?: unknown;
  sourceUrl?: unknown;
  sourceNotes?: unknown;
  lastVerifiedAt?: unknown;
};

function isProductLengthStructure(
  value: unknown
): value is ProductLengthStructure {
  return Object.values(ProductLengthStructure).includes(
    value as ProductLengthStructure
  );
}

function isFitUnit(
  value: unknown
): value is FitUnit {
  return Object.values(FitUnit).includes(
    value as FitUnit
  );
}

function isFitDataSource(
  value: unknown
): value is FitDataSource {
  return Object.values(FitDataSource).includes(
    value as FitDataSource
  );
}

function parsePositiveNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const numberValue = Number(value);

  if (
    !Number.isFinite(numberValue) ||
    numberValue <= 0
  ) {
    return null;
  }

  return numberValue;
}



function parseOptionalString(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed || null;
}

function parseOptionalDate(
  value: unknown
): Date | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

export async function PUT(
  request: NextRequest,
  { params }: RouteContext
) {
  await requireAdminSession();

  const { productId } = await params;

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },

    select: {
      id: true,
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

  let body: {
    lengthStructure?: unknown;
    options?: unknown;
  };

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

  const {
    lengthStructure,
    options,
  } = body;

  if (
    lengthStructure !== null &&
    !isProductLengthStructure(lengthStructure)
  ) {
    return NextResponse.json(
      {
        error: "Invalid length structure.",
      },
      {
        status: 400,
      }
    );
  }

  if (!Array.isArray(options)) {
    return NextResponse.json(
      {
        error: "Length options must be an array.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * ProductLengthOption currently represents independent
   * selectable product lengths.
   *
   * SIZE_DEPENDENT and LENGTH_BASED_SIZE use the
   * ProductSize measurement architecture instead.
   */
  if (
    lengthStructure !==
      ProductLengthStructure.INDEPENDENT &&
    options.length > 0
  ) {
    return NextResponse.json(
      {
        error:
          "Independent length options can only be saved when the length structure is Independent.",
      },
      {
        status: 400,
      }
    );
  }

  type ParsedLengthOption = {
  label: string;
  sourceValue: number | null;
  sourceUnit: FitUnit | null;
  valueCm: number | null;
  sortOrder: number;
  source: FitDataSource | null;
  sourceUrl: string | null;
  sourceNotes: string | null;
  lastVerifiedAt: Date | null;
};

const parsedOptions: ParsedLengthOption[] = [];

  for (
    let index = 0;
    index < options.length;
    index += 1
  ) {
    const option =
      options[index] as LengthOptionInput;

    const label =
      typeof option.label === "string"
        ? option.label.trim()
        : "";

    if (!label) {
      return NextResponse.json(
        {
          error: `Length option ${index + 1} needs a label.`,
        },
        {
          status: 400,
        }
      );
    }

    const sourceValue =
      parsePositiveNumber(option.sourceValue);

    /*
     * A non-numeric option such as "Tall" is valid
     * catalogue evidence, but it must remain numerically
     * uninterpreted.
     */
    if (sourceValue === null) {
      parsedOptions.push({
        label,
        sourceValue: null,
        sourceUnit: null,
        valueCm: null,
        sortOrder: index,
        source: null,
        sourceUrl: null,
        sourceNotes:
          parseOptionalString(option.sourceNotes),
        lastVerifiedAt: null,
      });

      continue;
    }

    if (!isFitUnit(option.sourceUnit)) {
      return NextResponse.json(
        {
          error: `Length option "${label}" needs a valid source unit.`,
        },
        {
          status: 400,
        }
      );
    }

    const source =
      option.source === null ||
      option.source === undefined ||
      option.source === ""
        ? null
        : isFitDataSource(option.source)
          ? option.source
          : undefined;

    if (source === undefined) {
      return NextResponse.json(
        {
          error: `Length option "${label}" has an invalid data source.`,
        },
        {
          status: 400,
        }
      );
    }

    const lastVerifiedAt =
      parseOptionalDate(option.lastVerifiedAt);

    if (
      option.lastVerifiedAt &&
      lastVerifiedAt === null
    ) {
      return NextResponse.json(
        {
          error: `Length option "${label}" has an invalid verification date.`,
        },
        {
          status: 400,
        }
      );
    }

    parsedOptions.push({
      label,
      sourceValue,
      sourceUnit: option.sourceUnit,
      valueCm: normalizeLengthToCm(
        sourceValue,
        option.sourceUnit
    ),
      sortOrder: index,
      source,
      sourceUrl:
        parseOptionalString(option.sourceUrl),
      sourceNotes:
        parseOptionalString(option.sourceNotes),
      lastVerifiedAt,
    });
  }

  const normalizedLabels =
    parsedOptions.map((option) =>
      option.label.toLocaleLowerCase()
    );

  if (
    new Set(normalizedLabels).size !==
    normalizedLabels.length
  ) {
    return NextResponse.json(
      {
        error:
          "Length option labels must be unique.",
      },
      {
        status: 400,
      }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: {
        id: productId,
      },

      data: {
        lengthStructure:
          lengthStructure as ProductLengthStructure | null,
      },
    });

    /*
     * The editor submits the complete current option set.
     * Replacing the child rows transactionally keeps the
     * product structure and its independent evidence in
     * one consistent state.
     *
     * ProductLengthOption IDs are not referenced by other
     * Fit models, so replacement is currently safe.
     */
    await tx.productLengthOption.deleteMany({
      where: {
        productId,
      },
    });

    if (parsedOptions.length > 0) {
      await tx.productLengthOption.createMany({
        data: parsedOptions.map((option) => ({
          productId,
          ...option,
        })),
      });
    }
  });

  return NextResponse.json({
    ok: true,
    lengthStructure,
    optionCount: parsedOptions.length,
  });
}