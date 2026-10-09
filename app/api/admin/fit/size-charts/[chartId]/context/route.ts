import { ProductType } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isProductType(value: unknown): value is ProductType {
  return (
    typeof value === "string" &&
    Object.values(ProductType).includes(value as ProductType)
  );
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
      { ok: false, error: "Invalid request." },
      { status: 400 }
    );
  }

  const rawProductTypes: unknown[] = Array.isArray(
    body.productTypes
  )
    ? body.productTypes
    : [];

  if (rawProductTypes.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Select at least one product type.",
      },
      { status: 400 }
    );
  }

  const productTypes = [
    ...new Set(
      rawProductTypes.filter(
        (value): value is ProductType =>
          isProductType(value)
      )
    ),
  ];

  if (productTypes.length !== rawProductTypes.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid product type.",
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

      productTypes: {
        select: {
          productType: true,
        },
      },

      entries: {
        select: {
          productSizeMappings: {
            select: {
              productSize: {
                select: {
                  product: {
                    select: {
                      title: true,

                      productTypes: {
                        select: {
                          productType: true,
                        },
                      },

                      productType: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!chart) {
    return NextResponse.json(
      { ok: false, error: "Size chart not found." },
      { status: 404 }
    );
  }

  const requestedTypes = new Set(productTypes);

  const removedTypes = chart.productTypes
    .map((item) => item.productType)
    .filter(
      (productType) => !requestedTypes.has(productType)
    );

  for (const removedType of removedTypes) {
    const dependentProduct = chart.entries
      .flatMap((entry) => entry.productSizeMappings)
      .map((mapping) => mapping.productSize.product)
      .find((product) => {
        const canonicalTypes = product.productTypes.map(
          (item) => item.productType
        );

        if (canonicalTypes.length > 0) {
          return canonicalTypes.includes(removedType);
        }

        return product.productType === removedType;
      });

    if (dependentProduct) {
      return NextResponse.json(
        {
          ok: false,
          error:
            `Cannot remove ${removedType} because ` +
            `"${dependentProduct.title}" is mapped to this chart.`,
        },
        { status: 400 }
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.brandSizeChartProductType.deleteMany({
      where: {
        chartId,
        productType: {
          notIn: productTypes,
        },
      },
    });

    for (const productType of productTypes) {
      await tx.brandSizeChartProductType.upsert({
        where: {
          chartId_productType: {
            chartId,
            productType,
          },
        },

        update: {},

        create: {
          chartId,
          productType,
        },
      });
    }
  });

  return NextResponse.json({
    ok: true,
    productTypes,
  });
}