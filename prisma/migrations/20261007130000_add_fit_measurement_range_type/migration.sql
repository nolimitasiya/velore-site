-- CreateEnum
CREATE TYPE "FitMeasurementRangeType" AS ENUM ('RANGE', 'UPPER_BOUND');

-- AlterTable
ALTER TABLE "BrandSizeChartMeasurement" ADD COLUMN     "rangeType" "FitMeasurementRangeType" NOT NULL DEFAULT 'RANGE';

-- AlterTable
ALTER TABLE "ProductSizeFitMeasurement" ADD COLUMN     "rangeType" "FitMeasurementRangeType" NOT NULL DEFAULT 'RANGE';
