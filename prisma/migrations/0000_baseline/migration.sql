-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('owner', 'admin', 'editor', 'viewer', 'super_admin');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('GBP', 'EUR', 'CHF', 'USD');

-- CreateEnum
CREATE TYPE "Badge" AS ENUM ('bestseller', 'new_in', 'editor_pick', 'modest_essential', 'limited_stock', 'sale', 'ramadan_edit', 'eid_edit', 'workwear', 'next_day');

-- CreateEnum
CREATE TYPE "BrandApplicationStatus" AS ENUM ('new', 'contacted', 'invited', 'contract_sent', 'contract_signed', 'onboarded', 'rejected');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('pending', 'approved', 'paid');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('ABAYA', 'DRESS', 'SKIRT', 'TOP', 'HIJAB');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'NEEDS_CHANGES', 'REJECTED');

-- CreateEnum
CREATE TYPE "TaxonomyType" AS ENUM ('TAG', 'MATERIAL', 'OCCASION');

-- CreateEnum
CREATE TYPE "TaxonomyRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AdminNotificationType" AS ENUM ('PRODUCT_SUBMITTED', 'TAXONOMY_REQUEST');

-- CreateEnum
CREATE TYPE "Region" AS ENUM ('EUROPE', 'AFRICA', 'ASIA', 'NORTH_AMERICA', 'SOUTH_AMERICA', 'OCEANIA', 'MIDDLE_EAST');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandMembership" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "brandId" UUID NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'viewer',

    CONSTRAINT "BrandMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandInvite" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "brandId" UUID NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'owner',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "defaultCommissionRate" DECIMAL(5,4),
    "aovEstimate" DECIMAL(12,2),
    "baseCountryCode" CHAR(2),
    "baseRegion" "Region",

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Occasion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Occasion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brandId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'GBP',
    "sourceUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "badges" "Badge"[] DEFAULT ARRAY[]::"Badge"[],
    "categoryId" UUID,
    "colour" TEXT,
    "note" TEXT,
    "price" DECIMAL(10,2),
    "stock" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "affiliateUrl" TEXT,
    "productType" "ProductType",
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "lastApprovedAt" TIMESTAMP(3),
    "worldwideShipping" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "reviewNote" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "filename" TEXT,
    "status" TEXT NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "valid" INTEGER NOT NULL DEFAULT 0,
    "invalid" INTEGER NOT NULL DEFAULT 0,
    "createdBrands" INTEGER NOT NULL DEFAULT 0,
    "createdProducts" INTEGER NOT NULL DEFAULT 0,
    "updatedProducts" INTEGER NOT NULL DEFAULT 0,
    "rowErrors" JSONB,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "brandId" UUID,
    "userId" UUID,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "tags" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confirmToken" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "unsubscribeToken" TEXT,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandApplication" (
    "id" TEXT NOT NULL,
    "website" TEXT,
    "email" TEXT NOT NULL,
    "notes" TEXT,
    "status" "BrandApplicationStatus" NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "socialMedia" TEXT,
    "contractSentAt" TIMESTAMP(3),
    "contractSignedAt" TIMESTAMP(3),
    "contractSentPath" TEXT,
    "contractSignedPath" TEXT,

    CONSTRAINT "BrandApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateClick" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productId" UUID,
    "brandId" UUID NOT NULL,
    "clickedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateEarning" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brandId" UUID NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'GBP',
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AffiliateEarning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandPayout" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brandId" UUID NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'pending',
    "method" TEXT,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrandPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaitlistSubscriber" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaitlistSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTag" (
    "productId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "ProductTag_pkey" PRIMARY KEY ("productId","tagId")
);

-- CreateTable
CREATE TABLE "ProductMaterial" (
    "productId" UUID NOT NULL,
    "materialId" UUID NOT NULL,

    CONSTRAINT "ProductMaterial_pkey" PRIMARY KEY ("productId","materialId")
);

-- CreateTable
CREATE TABLE "ProductOccasion" (
    "productId" UUID NOT NULL,
    "occasionId" UUID NOT NULL,

    CONSTRAINT "ProductOccasion_pkey" PRIMARY KEY ("productId","occasionId")
);

-- CreateTable
CREATE TABLE "TaxonomyRequest" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brandId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "TaxonomyType" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "TaxonomyRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByAdminId" TEXT,

    CONSTRAINT "TaxonomyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductShippingCountry" (
    "productId" UUID NOT NULL,
    "countryCode" CHAR(2) NOT NULL,

    CONSTRAINT "ProductShippingCountry_pkey" PRIMARY KEY ("productId","countryCode")
);

-- CreateTable
CREATE TABLE "AdminNotification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "AdminNotificationType" NOT NULL,
    "brandId" UUID,
    "productId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "BrandMembership_brandId_idx" ON "BrandMembership"("brandId");

-- CreateIndex
CREATE INDEX "BrandMembership_userId_idx" ON "BrandMembership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandMembership_userId_brandId_key" ON "BrandMembership"("userId", "brandId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandInvite_tokenHash_key" ON "BrandInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "BrandInvite_email_idx" ON "BrandInvite"("email");

-- CreateIndex
CREATE INDEX "BrandInvite_brandId_idx" ON "BrandInvite"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Occasion_slug_key" ON "Occasion"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Material_slug_key" ON "Material"("slug");

-- CreateIndex
CREATE INDEX "Product_brandId_slug_idx" ON "Product"("brandId", "slug");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_affiliateUrl_idx" ON "Product"("affiliateUrl");

-- CreateIndex
CREATE INDEX "Product_productType_idx" ON "Product"("productType");

-- CreateIndex
CREATE UNIQUE INDEX "Product_brandId_sourceUrl_key" ON "Product"("brandId", "sourceUrl");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "ImportJob_brandId_idx" ON "ImportJob"("brandId");

-- CreateIndex
CREATE INDEX "ImportJob_userId_idx" ON "ImportJob"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_confirmToken_key" ON "NewsletterSubscriber"("confirmToken");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubscribeToken_key" ON "NewsletterSubscriber"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "BrandApplication_status_createdAt_idx" ON "BrandApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "BrandApplication_email_idx" ON "BrandApplication"("email");

-- CreateIndex
CREATE INDEX "AffiliateClick_brandId_clickedAt_idx" ON "AffiliateClick"("brandId", "clickedAt");

-- CreateIndex
CREATE INDEX "AffiliateClick_productId_clickedAt_idx" ON "AffiliateClick"("productId", "clickedAt");

-- CreateIndex
CREATE INDEX "AffiliateEarning_month_idx" ON "AffiliateEarning"("month");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateEarning_brandId_month_key" ON "AffiliateEarning"("brandId", "month");

-- CreateIndex
CREATE INDEX "BrandPayout_month_idx" ON "BrandPayout"("month");

-- CreateIndex
CREATE UNIQUE INDEX "BrandPayout_brandId_month_key" ON "BrandPayout"("brandId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "WaitlistSubscriber_email_key" ON "WaitlistSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE INDEX "ProductTag_tagId_idx" ON "ProductTag"("tagId");

-- CreateIndex
CREATE INDEX "ProductTag_productId_idx" ON "ProductTag"("productId");

-- CreateIndex
CREATE INDEX "ProductMaterial_materialId_idx" ON "ProductMaterial"("materialId");

-- CreateIndex
CREATE INDEX "ProductMaterial_productId_idx" ON "ProductMaterial"("productId");

-- CreateIndex
CREATE INDEX "ProductOccasion_occasionId_idx" ON "ProductOccasion"("occasionId");

-- CreateIndex
CREATE INDEX "ProductOccasion_productId_idx" ON "ProductOccasion"("productId");

-- CreateIndex
CREATE INDEX "TaxonomyRequest_brandId_status_createdAt_idx" ON "TaxonomyRequest"("brandId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "TaxonomyRequest_type_status_idx" ON "TaxonomyRequest"("type", "status");

-- CreateIndex
CREATE INDEX "TaxonomyRequest_reviewedByAdminId_idx" ON "TaxonomyRequest"("reviewedByAdminId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxonomyRequest_type_slug_key" ON "TaxonomyRequest"("type", "slug");

-- CreateIndex
CREATE INDEX "ProductShippingCountry_countryCode_idx" ON "ProductShippingCountry"("countryCode");

-- CreateIndex
CREATE INDEX "ProductShippingCountry_productId_idx" ON "ProductShippingCountry"("productId");

-- CreateIndex
CREATE INDEX "AdminNotification_type_createdAt_idx" ON "AdminNotification"("type", "createdAt");

-- CreateIndex
CREATE INDEX "AdminNotification_readAt_idx" ON "AdminNotification"("readAt");

-- AddForeignKey
ALTER TABLE "BrandMembership" ADD CONSTRAINT "BrandMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandMembership" ADD CONSTRAINT "BrandMembership_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandInvite" ADD CONSTRAINT "BrandInvite_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateEarning" ADD CONSTRAINT "AffiliateEarning_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandPayout" ADD CONSTRAINT "BrandPayout_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTag" ADD CONSTRAINT "ProductTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMaterial" ADD CONSTRAINT "ProductMaterial_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMaterial" ADD CONSTRAINT "ProductMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOccasion" ADD CONSTRAINT "ProductOccasion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOccasion" ADD CONSTRAINT "ProductOccasion_occasionId_fkey" FOREIGN KEY ("occasionId") REFERENCES "Occasion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxonomyRequest" ADD CONSTRAINT "TaxonomyRequest_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxonomyRequest" ADD CONSTRAINT "TaxonomyRequest_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxonomyRequest" ADD CONSTRAINT "TaxonomyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductShippingCountry" ADD CONSTRAINT "ProductShippingCountry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNotification" ADD CONSTRAINT "AdminNotification_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminNotification" ADD CONSTRAINT "AdminNotification_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

