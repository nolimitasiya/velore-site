-- CreateTable
CREATE TABLE "ProductFitSizingRequirement" (
    "id" TEXT NOT NULL,
    "fitProfileId" TEXT NOT NULL,
    "type" "FitMeasurementType" NOT NULL,
    "component" "FitGarmentComponent" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductFitSizingRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductFitSizingRequirement_fitProfileId_idx" ON "ProductFitSizingRequirement"("fitProfileId");

-- CreateIndex
CREATE INDEX "ProductFitSizingRequirement_type_idx" ON "ProductFitSizingRequirement"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFitSizingRequirement_fitProfileId_type_component_key" ON "ProductFitSizingRequirement"("fitProfileId", "type", "component");

-- AddForeignKey
ALTER TABLE "ProductFitSizingRequirement" ADD CONSTRAINT "ProductFitSizingRequirement_fitProfileId_fkey" FOREIGN KEY ("fitProfileId") REFERENCES "ProductFitProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
