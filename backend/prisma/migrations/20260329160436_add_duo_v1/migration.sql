/*
  Warnings:

  - A unique constraint covering the columns `[duoId,name]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[duoId,name]` on the table `PaymentMethod` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "duoId" TEXT;

-- AlterTable
ALTER TABLE "PaymentMethod" ADD COLUMN     "duoId" TEXT;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "duoId" TEXT;

-- CreateTable
CREATE TABLE "Duo" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "closedById" TEXT,

    CONSTRAINT "Duo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuoMember" (
    "id" TEXT NOT NULL,
    "duoId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DuoMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Duo_code_key" ON "Duo"("code");

-- CreateIndex
CREATE UNIQUE INDEX "DuoMember_duoId_userId_key" ON "DuoMember"("duoId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_duoId_name_key" ON "Category"("duoId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_duoId_name_key" ON "PaymentMethod"("duoId", "name");

-- CreateIndex
CREATE INDEX "Transaction_duoId_idx" ON "Transaction"("duoId");

-- AddForeignKey
ALTER TABLE "DuoMember" ADD CONSTRAINT "DuoMember_duoId_fkey" FOREIGN KEY ("duoId") REFERENCES "Duo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DuoMember" ADD CONSTRAINT "DuoMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_duoId_fkey" FOREIGN KEY ("duoId") REFERENCES "Duo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_duoId_fkey" FOREIGN KEY ("duoId") REFERENCES "Duo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_duoId_fkey" FOREIGN KEY ("duoId") REFERENCES "Duo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
