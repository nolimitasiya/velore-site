-- CreateTable
CREATE TABLE "DiaryPostProduct" (
    "diaryPostId" TEXT NOT NULL,
    "productId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiaryPostProduct_pkey" PRIMARY KEY ("diaryPostId","productId")
);

-- CreateIndex
CREATE INDEX "DiaryPostProduct_diaryPostId_sortOrder_idx" ON "DiaryPostProduct"("diaryPostId", "sortOrder");

-- CreateIndex
CREATE INDEX "DiaryPostProduct_productId_idx" ON "DiaryPostProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "DiaryPostProduct_diaryPostId_sortOrder_key" ON "DiaryPostProduct"("diaryPostId", "sortOrder");

-- AddForeignKey
ALTER TABLE "DiaryPostProduct" ADD CONSTRAINT "DiaryPostProduct_diaryPostId_fkey" FOREIGN KEY ("diaryPostId") REFERENCES "DiaryPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryPostProduct" ADD CONSTRAINT "DiaryPostProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
