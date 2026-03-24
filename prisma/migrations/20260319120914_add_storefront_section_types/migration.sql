-- CreateEnum
CREATE TYPE "StorefrontSectionType" AS ENUM ('DEFAULT', 'COUNTRY', 'CAMPAIGN');

-- AlterTable
ALTER TABLE "StorefrontSection" ADD COLUMN     "campaignAppliesToAllCountries" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "type" "StorefrontSectionType" NOT NULL DEFAULT 'COUNTRY';

-- CreateTable
CREATE TABLE "StorefrontSectionCountry" (
    "sectionId" UUID NOT NULL,
    "countryCode" CHAR(2) NOT NULL,

    CONSTRAINT "StorefrontSectionCountry_pkey" PRIMARY KEY ("sectionId","countryCode")
);

-- CreateIndex
CREATE INDEX "StorefrontSectionCountry_countryCode_idx" ON "StorefrontSectionCountry"("countryCode");

-- CreateIndex
CREATE INDEX "StorefrontSectionCountry_sectionId_idx" ON "StorefrontSectionCountry"("sectionId");

-- CreateIndex
CREATE INDEX "StorefrontSection_type_idx" ON "StorefrontSection"("type");

-- CreateIndex
CREATE INDEX "StorefrontSection_isActive_type_idx" ON "StorefrontSection"("isActive", "type");

-- AddForeignKey
ALTER TABLE "StorefrontSectionCountry" ADD CONSTRAINT "StorefrontSectionCountry_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "StorefrontSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
