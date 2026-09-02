export const AGE_BANDS = [
  "13-17",
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65+",
] as const;

export type AgeBand =
  (typeof AGE_BANDS)[number];

export function calculateAge(
  dateOfBirth: Date,
  referenceDate = new Date()
) {
  let age =
    referenceDate.getUTCFullYear() -
    dateOfBirth.getUTCFullYear();

  const monthDifference =
    referenceDate.getUTCMonth() -
    dateOfBirth.getUTCMonth();

  const birthdayNotReached =
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      referenceDate.getUTCDate() <
        dateOfBirth.getUTCDate()
    );

  if (birthdayNotReached) {
    age -= 1;
  }

  return age;
}

export function getAgeBand(
  dateOfBirth: Date | null | undefined,
  referenceDate = new Date()
): AgeBand | null {
  if (!dateOfBirth) {
    return null;
  }

  const age =
    calculateAge(
      dateOfBirth,
      referenceDate
    );

  if (age < 13) {
    return null;
  }

  if (age <= 17) {
    return "13-17";
  }

  if (age <= 24) {
    return "18-24";
  }

  if (age <= 34) {
    return "25-34";
  }

  if (age <= 44) {
    return "35-44";
  }

  if (age <= 54) {
    return "45-54";
  }

  if (age <= 64) {
    return "55-64";
  }

  return "65+";
}