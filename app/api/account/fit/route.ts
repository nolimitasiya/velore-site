import {
  FitMeasurementType,
  FitUnit,
  HijabCoveragePreference,
  Prisma,
  ShopperFitPreference,
} from "@prisma/client";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import { requireAuthenticatedShopper } from "@/lib/auth/ShopperSession";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RawMeasurement = {
  type?: unknown;
  value?: unknown;
};

type RawBody = {
  preferredUnit?: unknown;
  fitPreference?: unknown;
  hijabCoveragePreference?: unknown;
  measurements?: unknown;
};

const ALLOWED_PROFILE_MEASUREMENTS = new Set<FitMeasurementType>([
  FitMeasurementType.HEIGHT,
  FitMeasurementType.BUST,
  FitMeasurementType.WAIST,
  FitMeasurementType.HIP,
  FitMeasurementType.INSEAM,
  FitMeasurementType.SHOULDER_WIDTH,
  FitMeasurementType.ARM_LENGTH,
  FitMeasurementType.SLEEVE_LENGTH,
  FitMeasurementType.GARMENT_LENGTH,
]);

function isEnumValue<T extends Record<string, string>>(
  enumObject: T,
  value: unknown
): value is T[keyof T] {
  return (
    typeof value === "string" &&
    Object.values(enumObject).includes(
      value as T[keyof T]
    )
  );
}

function parseMeasurementValue(
  value: unknown
): number | null {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return null;
  }

  const cleaned = String(value).trim();

  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    return null;
  }

  return parsed;
}

function toCentimetres(
  value: number,
  unit: FitUnit
) {
  return unit === FitUnit.IN
    ? value * 2.54
    : value;
}

function decimal(value: number) {
  return new Prisma.Decimal(
    value.toFixed(2)
  );
}

async function authenticatedShopper(
  request: NextRequest
) {
  try {
    return await requireAuthenticatedShopper(
      request
    );
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest
) {
  const shopper =
    await authenticatedShopper(request);

  if (!shopper) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthenticated.",
      },
      { status: 401 }
    );
  }

  const profile =
    await prisma.shopperFitProfile.findUnique({
      where: {
        shopperId: shopper.id,
      },

      select: {
        id: true,
        preferredUnit: true,
        fitPreference: true,
        hijabCoveragePreference: true,
        createdAt: true,
        updatedAt: true,

        measurements: {
          select: {
            type: true,
            valueCm: true,
          },

          orderBy: {
            type: "asc",
          },
        },
      },
    });

  if (!profile) {
    return NextResponse.json({
      ok: true,
      profile: null,
    });
  }

  return NextResponse.json({
    ok: true,

    profile: {
      id: profile.id,
      preferredUnit:
        profile.preferredUnit,
      fitPreference:
        profile.fitPreference,
      hijabCoveragePreference:
        profile.hijabCoveragePreference,

      measurements:
        profile.measurements.map(
          (measurement) => ({
            type: measurement.type,
            valueCm:
              measurement.valueCm.toString(),
          })
        ),

      createdAt:
        profile.createdAt.toISOString(),

      updatedAt:
        profile.updatedAt.toISOString(),
    },
  });
}

export async function PUT(
  request: NextRequest
) {
  const shopper =
    await authenticatedShopper(request);

  if (!shopper) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthenticated.",
      },
      { status: 401 }
    );
  }

  const body = (await request
    .json()
    .catch(() => null)) as RawBody | null;

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid request.",
      },
      { status: 400 }
    );
  }

  if (
    !isEnumValue(
      FitUnit,
      body.preferredUnit
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Select a valid measurement unit.",
      },
      { status: 400 }
    );
  }
  const preferredUnit = body.preferredUnit;

  if (
    !isEnumValue(
      ShopperFitPreference,
      body.fitPreference
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Select a valid fit preference.",
      },
      { status: 400 }
    );
  }

  const fitPreference = body.fitPreference;

  const hijabCoveragePreference =
    body.hijabCoveragePreference === null ||
    body.hijabCoveragePreference === undefined ||
    body.hijabCoveragePreference === ""
      ? null
      : body.hijabCoveragePreference;

  if (
    hijabCoveragePreference !== null &&
    !isEnumValue(
      HijabCoveragePreference,
      hijabCoveragePreference
    )
  ) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Select a valid hijab coverage preference.",
      },
      { status: 400 }
    );
  }

  const rawMeasurements: RawMeasurement[] =
    Array.isArray(body.measurements)
      ? body.measurements
      : [];

  const preparedMeasurements: Array<{
    type: FitMeasurementType;
    valueCm: number;
  }> = [];

  const seenTypes =
    new Set<FitMeasurementType>();

  for (
    let index = 0;
    index < rawMeasurements.length;
    index += 1
  ) {
    const measurement =
      rawMeasurements[index];

    if (
      !isEnumValue(
        FitMeasurementType,
        measurement.type
      ) ||
      !ALLOWED_PROFILE_MEASUREMENTS.has(
        measurement.type
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Invalid shopper measurement type.",
        },
        { status: 400 }
      );
    }

    if (seenTypes.has(measurement.type)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A measurement was submitted more than once.",
        },
        { status: 400 }
      );
    }

    seenTypes.add(measurement.type);

    const value =
      parseMeasurementValue(
        measurement.value
      );

    if (value === null) {
      return NextResponse.json(
        {
          ok: false,
          error: `Enter a valid value for ${measurement.type}.`,
        },
        { status: 400 }
      );
    }

    const valueCm =
      toCentimetres(
        value,
        preferredUnit
      );

    /*
     * Broad integrity guard.
     *
     * This is deliberately not a narrow
     * body-size assumption. Its purpose is
     * to catch malformed input rather than
     * decide what a person's body "should"
     * measure.
     */
    if (
      valueCm < 1 ||
      valueCm > 400
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: `The value for ${measurement.type} is outside the supported measurement range.`,
        },
        { status: 400 }
      );
    }

    preparedMeasurements.push({
      type: measurement.type,
      valueCm,
    });
  }

  const profile =
    await prisma.$transaction(
      async (tx) => {
        const savedProfile =
          await tx.shopperFitProfile.upsert({
            where: {
              shopperId: shopper.id,
            },

            create: {
              shopperId: shopper.id,
              preferredUnit,
              fitPreference,
              hijabCoveragePreference,
            },

            update: {
              preferredUnit,
              fitPreference,
              hijabCoveragePreference,
            },

            select: {
              id: true,
            },
          });

        /*
         * The submitted measurement collection
         * represents the shopper's complete
         * currently saved measurement set.
         *
         * Unlike BrandSizeChartEntry, nothing
         * elsewhere references the identity of
         * ShopperFitMeasurement rows. Upserting
         * by semantic measurement type keeps
         * their identities stable where possible.
         */

        const submittedTypes =
          preparedMeasurements.map(
            (measurement) =>
              measurement.type
          );

        await tx.shopperFitMeasurement.deleteMany({
          where: {
            fitProfileId:
              savedProfile.id,

            ...(submittedTypes.length > 0
              ? {
                  type: {
                    notIn:
                      submittedTypes,
                  },
                }
              : {}),
          },
        });

        for (
          const measurement of
          preparedMeasurements
        ) {
          await tx.shopperFitMeasurement.upsert({
            where: {
              fitProfileId_type: {
                fitProfileId:
                  savedProfile.id,
                type:
                  measurement.type,
              },
            },

            create: {
              fitProfileId:
                savedProfile.id,
              type:
                measurement.type,
              valueCm:
                decimal(
                  measurement.valueCm
                ),
            },

            update: {
              valueCm:
                decimal(
                  measurement.valueCm
                ),
            },
          });
        }

        return savedProfile;
      }
    );

  return NextResponse.json({
    ok: true,
    profileId: profile.id,
    measurementCount:
      preparedMeasurements.length,
  });
}