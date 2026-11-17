export type NewsletterConfirmationConsentState = {
  verifiedShopperCount: number;
  shopperMarketingConsent: boolean | null;
  shopperConsentVersion: number | null;
  latestAccountOperation: "ACCOUNT_OPT_IN" | "ACCOUNT_OPT_OUT" | null;
  latestAccountOperationVersion: number | null;
};

export function shouldBlockNewsletterConfirmation(
  state: NewsletterConfirmationConsentState
): boolean {
  if (state.verifiedShopperCount > 1) {
    return true;
  }

  if (state.verifiedShopperCount === 0) {
    return false;
  }

  return (
    state.shopperMarketingConsent === false &&
    state.latestAccountOperation === "ACCOUNT_OPT_OUT"
  );
}
