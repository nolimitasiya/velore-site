CREATE TABLE "ProductCompleteTheLook" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL,
    "linkedProductId" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductCompleteTheLook_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductCompleteTheLook_productId_linkedProductId_key"
ON "ProductCompleteTheLook"("productId", "linkedProductId");

CREATE INDEX "ProductCompleteTheLook_productId_position_idx"
ON "ProductCompleteTheLook"("productId", "position");

CREATE INDEX "ProductCompleteTheLook_linkedProductId_idx"
ON "ProductCompleteTheLook"("linkedProductId");

ALTER TABLE "ProductCompleteTheLook"
ADD CONSTRAINT "ProductCompleteTheLook_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "Product"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "ProductCompleteTheLook"
ADD CONSTRAINT "ProductCompleteTheLook_linkedProductId_fkey"
FOREIGN KEY ("linkedProductId")
REFERENCES "Product"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;