import {
  FitDataSource,
  FitMeasurementBasis,
  FitUnit,
  ProductType,
} from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/auth/AdminSession";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: unknown
): value is T[keyof T] {
  return (
    typeof value === "string" &&
    Object.values(enumObject).includes(value as T[keyof T])
  );
}

export async function POST(request: Request) {
  await requireAdminSession();

  const body = await request.json().catch(() => null);

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 }
    );
  }

  const brandId =
    typeof body.brandId === "string" ? body.brandId.trim() : "";

  const name =
    typeof body.name === "string" ? body.name.trim() : "";

  const sourceUrl =
    typeof body.sourceUrl === "string" ? body.sourceUrl.trim() : "";

  const sourceNotes =
    typeof body.sourceNotes === "string" ? body.sourceNotes.trim() : "";

  const rawProductTypes: unknown[] = Array.isArray(body.productTypes)
  ? body.productTypes
  : [];

const productTypes = [
  ...new Set(
    rawProductTypes.filter(
      (value): value is ProductType =>
        isEnumValue(ProductType, value)
    )
  ),
];

  if (!brandId) {
    return NextResponse.json(
      { ok: false, error: "Select a brand." },
      { status: 400 }
    );
  }

  if (!name) {
    return NextResponse.json(
      { ok: false, error: "Enter a chart name." },
      { status: 400 }
    );
  }

  if (
    !isEnumValue(FitMeasurementBasis, body.measurementBasis)
  ) {
    return NextResponse.json(
      { ok: false, error: "Select a valid measurement basis." },
      { status: 400 }
    );
  }

  if (!isEnumValue(FitUnit, body.sourceUnit)) {
    return NextResponse.json(
      { ok: false, error: "Select a valid source unit." },
      { status: 400 }
    );
  }

  if (!isEnumValue(FitDataSource, body.source)) {
    return NextResponse.json(
      { ok: false, error: "Select a valid data source." },
      { status: 400 }
    );
  }

  if (rawProductTypes.length === 0) {
  return NextResponse.json(
    {
      ok: false,
      error: "Select at least one product type.",
    },
    { status: 400 }
  );
}

if (productTypes.length !== rawProductTypes.length) {
  return NextResponse.json(
    {
      ok: false,
      error: "Invalid product type.",
    },
    { status: 400 }
  );
}

  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl);

      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "Enter a valid http or https source URL.",
        },
        { status: 400 }
      );
    }
  }

  let lastVerifiedAt: Date | null = null;

  if (
    typeof body.lastVerifiedAt === "string" &&
    body.lastVerifiedAt.trim()
  ) {
    const parsedDate = new Date(
      `${body.lastVerifiedAt.trim()}T12:00:00.000Z`
    );

    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        {
          ok: false,
          error: "Enter a valid verification date.",
        },
        { status: 400 }
      );
    }

    lastVerifiedAt = parsedDate;
  }

  const brand = await prisma.brand.findUnique({
    where: {
      id: brandId,
    },
    select: {
      id: true,
    },
  });

  if (!brand) {
    return NextResponse.json(
      { ok: false, error: "Brand not found." },
      { status: 404 }
    );
  }

  const chart = await prisma.brandSizeChart.create({
    data: {
      brandId,
      name,
      measurementBasis: body.measurementBasis,
      sourceUnit: body.sourceUnit,
      source: body.source,
      sourceNotes: sourceNotes || null,
      sourceUrl: sourceUrl || null,
      lastVerifiedAt,

      productTypes: {
        create: productTypes.map((productType) => ({
          productType,
        })),
      },
    },

    select: {
      id: true,
    },
  });

  return NextResponse.json({
    ok: true,
    chartId: chart.id,
  });
}
