-- CreateTable
CREATE TABLE "MaterialAllowedProductType" (
    "materialId" UUID NOT NULL,
    "productType" "ProductType" NOT NULL,

    CONSTRAINT "MaterialAllowedProductType_pkey" PRIMARY KEY ("materialId","productType")
);

-- CreateIndex
CREATE INDEX "MaterialAllowedProductType_productType_idx" ON "MaterialAllowedProductType"("productType");

-- AddForeignKey
ALTER TABLE "MaterialAllowedProductType" ADD CONSTRAINT "MaterialAllowedProductType_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;
