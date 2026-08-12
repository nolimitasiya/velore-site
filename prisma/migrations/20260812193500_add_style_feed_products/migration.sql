CREATE TABLE "HomepageStyleFeedItemProduct" (
    "id" TEXT NOT NULL,
    "feedItemId" TEXT NOT NULL,
    "productId" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HomepageStyleFeedItemProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HomepageStyleFeedItemProduct_feedItemId_productId_key"
ON "HomepageStyleFeedItemProduct"("feedItemId", "productId");

CREATE UNIQUE INDEX "HomepageStyleFeedItemProduct_feedItemId_position_key"
ON "HomepageStyleFeedItemProduct"("feedItemId", "position");

CREATE INDEX "HomepageStyleFeedItemProduct_feedItemId_position_idx"
ON "HomepageStyleFeedItemProduct"("feedItemId", "position");

CREATE INDEX "HomepageStyleFeedItemProduct_productId_idx"
ON "HomepageStyleFeedItemProduct"("productId");

ALTER TABLE "HomepageStyleFeedItemProduct"
ADD CONSTRAINT "HomepageStyleFeedItemProduct_feedItemId_fkey"
FOREIGN KEY ("feedItemId")
REFERENCES "HomepageStyleFeedItem"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "HomepageStyleFeedItemProduct"
ADD CONSTRAINT "HomepageStyleFeedItemProduct_productId_fkey"
FOREIGN KEY ("productId")
REFERENCES "Product"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;





