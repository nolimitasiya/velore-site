-- CreateEnum
CREATE TYPE "FitUnit" AS ENUM ('CM', 'IN');

-- CreateEnum
CREATE TYPE "ShopperFitPreference" AS ENUM ('CLOSER', 'REGULAR', 'RELAXED');

-- CreateEnum
CREATE TYPE "ProductIntendedFit" AS ENUM ('SLIM', 'REGULAR', 'RELAXED', 'OVERSIZED');

-- CreateEnum
CREATE TYPE "FabricStretch" AS ENUM ('NONE', 'LOW', 'MEDIUM', 'HIGH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "FitMeasurementBasis" AS ENUM ('BODY', 'GARMENT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "FitDataSource" AS ENUM ('BRAND_WEBSITE', 'BRAND_PORTAL', 'ADMIN');

-- CreateEnum
CREATE TYPE "FitMeasurementType" AS ENUM ('HEIGHT', 'BUST', 'WAIST', 'HIP', 'SHOULDER_WIDTH', 'SLEEVE_LENGTH', 'ARM_LENGTH', 'ARMHOLE', 'INSEAM', 'GARMENT_LENGTH', 'FRONT_LENGTH', 'BACK_LENGTH', 'TOP_LENGTH', 'SKIRT_LENGTH', 'TROUSER_LENGTH', 'WIDTH', 'NECK_OPENING');

-- CreateEnum
CREATE TYPE "FitGarmentComponent" AS ENUM ('WHOLE_GARMENT', 'TOP', 'BOTTOM', 'SKIRT', 'TROUSER', 'JACKET', 'DRESS', 'ABAYA', 'KHIMAR', 'JILBAB', 'HIJAB');

-- CreateEnum
CREATE TYPE "HijabCoveragePreference" AS ENUM ('STANDARD', 'GENEROUS', 'EXTRA_COVERAGE');

-- CreateTable
CREATE TABLE "ShopperFitProfile" (
    "id" TEXT NOT NULL,
    "shopperId" UUID NOT NULL,
    "preferredUnit" "FitUnit" NOT NULL DEFAULT 'CM',
    "fitPreference" "ShopperFitPreference" NOT NULL DEFAULT 'REGULAR',
    "hijabCoveragePreference" "HijabCoveragePreference",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopperFitProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopperFitMeasurement" (
    "id" TEXT NOT NULL,
    "fitProfileId" TEXT NOT NULL,
    "type" "FitMeasurementType" NOT NULL,
    "valueCm" DECIMAL(8,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopperFitMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandSizeChart" (
    "id" TEXT NOT NULL,
    "brandId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "measurementBasis" "FitMeasurementBasis" NOT NULL DEFAULT 'UNKNOWN',
    "sourceUnit" "FitUnit" NOT NULL,
    "source" "FitDataSource" NOT NULL,
    "sourceUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandSizeChart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandSizeChartProductType" (
    "chartId" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,

    CONSTRAINT "BrandSizeChartProductType_pkey" PRIMARY KEY ("chartId","productType")
);

-- CreateTable
CREATE TABLE "BrandSizeChartEntry" (
    "id" TEXT NOT NULL,
    "chartId" TEXT NOT NULL,
    "sizeLabel" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandSizeChartEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandSizeChartMeasurement" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "type" "FitMeasurementType" NOT NULL,
    "component" "FitGarmentComponent" NOT NULL DEFAULT 'WHOLE_GARMENT',
    "minValueCm" DECIMAL(8,2) NOT NULL,
    "maxValueCm" DECIMAL(8,2) NOT NULL,
    "sourceMinValue" DECIMAL(8,2) NOT NULL,
    "sourceMaxValue" DECIMAL(8,2) NOT NULL,
    "sourceUnit" "FitUnit" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandSizeChartMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductFitProfile" (
    "id" TEXT NOT NULL,
    "productId" UUID NOT NULL,
    "intendedFit" "ProductIntendedFit",
    "stretch" "FabricStretch" NOT NULL DEFAULT 'UNKNOWN',
    "fitNotes" TEXT,
    "measurementBasis" "FitMeasurementBasis" NOT NULL DEFAULT 'UNKNOWN',
    "source" "FitDataSource",
    "sourceUrl" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductFitProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductFitMeasurement" (
    "id" TEXT NOT NULL,
    "fitProfileId" TEXT NOT NULL,
    "type" "FitMeasurementType" NOT NULL,
    "component" "FitGarmentComponent" NOT NULL DEFAULT 'WHOLE_GARMENT',
    "minValueCm" DECIMAL(8,2) NOT NULL,
    "maxValueCm" DECIMAL(8,2) NOT NULL,
    "sourceMinValue" DECIMAL(8,2) NOT NULL,
    "sourceMaxValue" DECIMAL(8,2) NOT NULL,
    "sourceUnit" "FitUnit" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductFitMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSizeFitMeasurement" (
    "id" TEXT NOT NULL,
    "fitProfileId" TEXT NOT NULL,
    "productId" UUID NOT NULL,
    "sizeId" UUID NOT NULL,
    "type" "FitMeasurementType" NOT NULL,
    "component" "FitGarmentComponent" NOT NULL DEFAULT 'WHOLE_GARMENT',
    "minValueCm" DECIMAL(8,2) NOT NULL,
    "maxValueCm" DECIMAL(8,2) NOT NULL,
    "sourceMinValue" DECIMAL(8,2) NOT NULL,
    "sourceMaxValue" DECIMAL(8,2) NOT NULL,
    "sourceUnit" "FitUnit" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSizeFitMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSizeChartMapping" (
    "productId" UUID NOT NULL,
    "sizeId" UUID NOT NULL,
    "entryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSizeChartMapping_pkey" PRIMARY KEY ("productId","sizeId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopperFitProfile_shopperId_key" ON "ShopperFitProfile"("shopperId");

-- CreateIndex
CREATE INDEX "ShopperFitProfile_shopperId_idx" ON "ShopperFitProfile"("shopperId");

-- CreateIndex
CREATE INDEX "ShopperFitMeasurement_fitProfileId_idx" ON "ShopperFitMeasurement"("fitProfileId");

-- CreateIndex
CREATE INDEX "ShopperFitMeasurement_type_idx" ON "ShopperFitMeasurement"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ShopperFitMeasurement_fitProfileId_type_key" ON "ShopperFitMeasurement"("fitProfileId", "type");

-- CreateIndex
CREATE INDEX "BrandSizeChart_brandId_idx" ON "BrandSizeChart"("brandId");

-- CreateIndex
CREATE INDEX "BrandSizeChart_brandId_isActive_idx" ON "BrandSizeChart"("brandId", "isActive");

-- CreateIndex
CREATE INDEX "BrandSizeChart_lastVerifiedAt_idx" ON "BrandSizeChart"("lastVerifiedAt");

-- CreateIndex
CREATE INDEX "BrandSizeChartProductType_productType_idx" ON "BrandSizeChartProductType"("productType");

-- CreateIndex
CREATE INDEX "BrandSizeChartEntry_chartId_sortOrder_idx" ON "BrandSizeChartEntry"("chartId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "BrandSizeChartEntry_chartId_sizeLabel_key" ON "BrandSizeChartEntry"("chartId", "sizeLabel");

-- CreateIndex
CREATE INDEX "BrandSizeChartMeasurement_entryId_idx" ON "BrandSizeChartMeasurement"("entryId");

-- CreateIndex
CREATE INDEX "BrandSizeChartMeasurement_type_idx" ON "BrandSizeChartMeasurement"("type");

-- CreateIndex
CREATE UNIQUE INDEX "BrandSizeChartMeasurement_entryId_type_component_key" ON "BrandSizeChartMeasurement"("entryId", "type", "component");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFitProfile_productId_key" ON "ProductFitProfile"("productId");

-- CreateIndex
CREATE INDEX "ProductFitProfile_productId_idx" ON "ProductFitProfile"("productId");

-- CreateIndex
CREATE INDEX "ProductFitProfile_lastVerifiedAt_idx" ON "ProductFitProfile"("lastVerifiedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFitProfile_id_productId_key" ON "ProductFitProfile"("id", "productId");

-- CreateIndex
CREATE INDEX "ProductFitMeasurement_fitProfileId_idx" ON "ProductFitMeasurement"("fitProfileId");

-- CreateIndex
CREATE INDEX "ProductFitMeasurement_type_idx" ON "ProductFitMeasurement"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFitMeasurement_fitProfileId_type_component_key" ON "ProductFitMeasurement"("fitProfileId", "type", "component");

-- CreateIndex
CREATE INDEX "ProductSizeFitMeasurement_fitProfileId_idx" ON "ProductSizeFitMeasurement"("fitProfileId");

-- CreateIndex
CREATE INDEX "ProductSizeFitMeasurement_productId_sizeId_idx" ON "ProductSizeFitMeasurement"("productId", "sizeId");

-- CreateIndex
CREATE INDEX "ProductSizeFitMeasurement_type_idx" ON "ProductSizeFitMeasurement"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSizeFitMeasurement_productId_sizeId_type_component_key" ON "ProductSizeFitMeasurement"("productId", "sizeId", "type", "component");

-- CreateIndex
CREATE INDEX "ProductSizeChartMapping_entryId_idx" ON "ProductSizeChartMapping"("entryId");

-- AddForeignKey
ALTER TABLE "ShopperFitProfile" ADD CONSTRAINT "ShopperFitProfile_shopperId_fkey" FOREIGN KEY ("shopperId") REFERENCES "Shopper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopperFitMeasurement" ADD CONSTRAINT "ShopperFitMeasurement_fitProfileId_fkey" FOREIGN KEY ("fitProfileId") REFERENCES "ShopperFitProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandSizeChart" ADD CONSTRAINT "BrandSizeChart_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandSizeChartProductType" ADD CONSTRAINT "BrandSizeChartProductType_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "BrandSizeChart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandSizeChartEntry" ADD CONSTRAINT "BrandSizeChartEntry_chartId_fkey" FOREIGN KEY ("chartId") REFERENCES "BrandSizeChart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandSizeChartMeasurement" ADD CONSTRAINT "BrandSizeChartMeasurement_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "BrandSizeChartEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFitProfile" ADD CONSTRAINT "ProductFitProfile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFitMeasurement" ADD CONSTRAINT "ProductFitMeasurement_fitProfileId_fkey" FOREIGN KEY ("fitProfileId") REFERENCES "ProductFitProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSizeFitMeasurement" ADD CONSTRAINT "ProductSizeFitMeasurement_fitProfileId_productId_fkey" FOREIGN KEY ("fitProfileId", "productId") REFERENCES "ProductFitProfile"("id", "productId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSizeFitMeasurement" ADD CONSTRAINT "ProductSizeFitMeasurement_productId_sizeId_fkey" FOREIGN KEY ("productId", "sizeId") REFERENCES "ProductSize"("productId", "sizeId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSizeChartMapping" ADD CONSTRAINT "ProductSizeChartMapping_productId_sizeId_fkey" FOREIGN KEY ("productId", "sizeId") REFERENCES "ProductSize"("productId", "sizeId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSizeChartMapping" ADD CONSTRAINT "ProductSizeChartMapping_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "BrandSizeChartEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
