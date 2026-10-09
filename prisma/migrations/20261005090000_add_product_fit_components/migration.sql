-- CreateTable
CREATE TABLE "ProductFitComponent" (
    "id" TEXT NOT NULL,
    "fitProfileId" TEXT NOT NULL,
    "component" "FitGarmentComponent" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductFitComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductFitComponent_fitProfileId_idx" ON "ProductFitComponent"("fitProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFitComponent_fitProfileId_component_key" ON "ProductFitComponent"("fitProfileId", "component");

-- AddForeignKey
ALTER TABLE "ProductFitComponent" ADD CONSTRAINT "ProductFitComponent_fitProfileId_fkey" FOREIGN KEY ("fitProfileId") REFERENCES "ProductFitProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
