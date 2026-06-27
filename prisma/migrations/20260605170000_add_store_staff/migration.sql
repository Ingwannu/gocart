-- CreateTable
CREATE TABLE "StoreStaff" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreStaff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoreStaff_storeId_userId_key" ON "StoreStaff"("storeId", "userId");

-- CreateIndex
CREATE INDEX "StoreStaff_userId_idx" ON "StoreStaff"("userId");

-- CreateIndex
CREATE INDEX "StoreStaff_storeId_idx" ON "StoreStaff"("storeId");

-- AddForeignKey
ALTER TABLE "StoreStaff" ADD CONSTRAINT "StoreStaff_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreStaff" ADD CONSTRAINT "StoreStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
