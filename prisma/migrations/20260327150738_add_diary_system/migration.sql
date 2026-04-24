-- CreateEnum
CREATE TYPE "DiaryStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "DiaryPost" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "contentJson" JSONB,
    "contentHtml" TEXT,
    "coverImageUrl" TEXT,
    "coverImageAlt" TEXT,
    "status" "DiaryStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "readCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DiaryPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaryImage" (
    "id" TEXT NOT NULL,
    "diaryPostId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "altText" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiaryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaryRead" (
    "id" TEXT NOT NULL,
    "diaryPostId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "countryCode" TEXT,
    "shopperCountryCode" TEXT,
    "shopperCurrencyCode" TEXT,
    "sourcePage" TEXT,
    "sectionKey" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,

    CONSTRAINT "DiaryRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DiaryPost_slug_key" ON "DiaryPost"("slug");

-- CreateIndex
CREATE INDEX "DiaryPost_status_publishedAt_idx" ON "DiaryPost"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "DiaryPost_slug_idx" ON "DiaryPost"("slug");

-- CreateIndex
CREATE INDEX "DiaryImage_diaryPostId_sortOrder_idx" ON "DiaryImage"("diaryPostId", "sortOrder");

-- CreateIndex
CREATE INDEX "DiaryRead_diaryPostId_readAt_idx" ON "DiaryRead"("diaryPostId", "readAt");

-- CreateIndex
CREATE INDEX "DiaryRead_readAt_idx" ON "DiaryRead"("readAt");

-- CreateIndex
CREATE INDEX "DiaryRead_shopperCountryCode_idx" ON "DiaryRead"("shopperCountryCode");

-- AddForeignKey
ALTER TABLE "DiaryImage" ADD CONSTRAINT "DiaryImage_diaryPostId_fkey" FOREIGN KEY ("diaryPostId") REFERENCES "DiaryPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryRead" ADD CONSTRAINT "DiaryRead_diaryPostId_fkey" FOREIGN KEY ("diaryPostId") REFERENCES "DiaryPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
