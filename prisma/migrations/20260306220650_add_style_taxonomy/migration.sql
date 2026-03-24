-- AlterEnum
ALTER TYPE "TaxonomyType" ADD VALUE 'STYLE';

-- CreateTable
CREATE TABLE "Style" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Style_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StyleAllowedProductType" (
    "styleId" UUID NOT NULL,
    "productType" "ProductType" NOT NULL,

    CONSTRAINT "StyleAllowedProductType_pkey" PRIMARY KEY ("styleId","productType")
);

-- CreateTable
CREATE TABLE "ProductStyle" (
    "productId" UUID NOT NULL,
    "styleId" UUID NOT NULL,

    CONSTRAINT "ProductStyle_pkey" PRIMARY KEY ("productId","styleId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Style_slug_key" ON "Style"("slug");

-- CreateIndex
CREATE INDEX "StyleAllowedProductType_productType_idx" ON "StyleAllowedProductType"("productType");

-- CreateIndex
CREATE INDEX "ProductStyle_styleId_idx" ON "ProductStyle"("styleId");

-- CreateIndex
CREATE INDEX "ProductStyle_productId_idx" ON "ProductStyle"("productId");

-- AddForeignKey
ALTER TABLE "StyleAllowedProductType" ADD CONSTRAINT "StyleAllowedProductType_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStyle" ADD CONSTRAINT "ProductStyle_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStyle" ADD CONSTRAINT "ProductStyle_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE CASCADE ON UPDATE CASCADE;
