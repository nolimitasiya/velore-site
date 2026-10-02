import { FitUnit } from "@prisma/client";

export function normalizeLengthToCm(
  value: number,
  unit: FitUnit
): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(
      "Length value must be a positive finite number."
    );
  }

  if (unit === FitUnit.CM) {
    return value;
  }

  if (unit === FitUnit.IN) {
    return value * 2.54;
  }

  const exhaustiveCheck: never = unit;

  throw new Error(
    `Unsupported Fit unit: ${exhaustiveCheck}`
  );
}