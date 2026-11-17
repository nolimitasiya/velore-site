-- Record the provider operation used for shopper marketing reconciliation.
CREATE TYPE "ShopperMarketingProviderOperationType" AS ENUM (
    'SUBSCRIBE',
    'UNSUBSCRIBE',
    'REMOVE_FROM_SHOPPER_LIST'
);

ALTER TABLE "ShopperMarketingConsentSync"
ADD COLUMN "providerOperationType" "ShopperMarketingProviderOperationType";