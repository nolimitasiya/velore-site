export type ShopperMarketingEligibilityInput = {
  marketingConsent: boolean;
  marketingConsentAt: Date | null;
  dateOfBirth: Date | null;
};

export function getShopperAge(
  dateOfBirth: Date,
  now: Date = new Date()
): number | null {
  if (
    !(dateOfBirth instanceof Date) ||
    Number.isNaN(dateOfBirth.getTime()) ||
    Number.isNaN(now.getTime()) ||
    dateOfBirth.getTime() > now.getTime()
  ) {
    return null;
  }

  let age =
    now.getUTCFullYear() -
    dateOfBirth.getUTCFullYear();

  const monthDifference =
    now.getUTCMonth() -
    dateOfBirth.getUTCMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      now.getUTCDate() < dateOfBirth.getUTCDate())
  ) {
    age -= 1;
  }

  return age;
}

export function isShopperMarketingEligible(
  shopper: ShopperMarketingEligibilityInput,
  now: Date = new Date()
): boolean {
  if (
    shopper.marketingConsent !== true ||
    !shopper.marketingConsentAt ||
    !shopper.dateOfBirth
  ) {
    return false;
  }

  if (
    Number.isNaN(shopper.marketingConsentAt.getTime()) ||
    shopper.marketingConsentAt.getTime() > now.getTime()
  ) {
    return false;
  }

  const age = getShopperAge(
    shopper.dateOfBirth,
    now
  );

  return age !== null && age >= 18;
}
