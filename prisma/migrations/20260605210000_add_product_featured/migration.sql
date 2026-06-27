ALTER TABLE "Product" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Product_isFeatured_idx" ON "Product"("isFeatured");
