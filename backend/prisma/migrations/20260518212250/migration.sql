-- CreateTable
CREATE TABLE "RecurringPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "duoId" TEXT,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "everyDays" INTEGER,
    "nextDate" TIMESTAMP(3) NOT NULL,
    "durationType" TEXT NOT NULL DEFAULT 'indefinite',
    "durationMonths" INTEGER,
    "endDate" TIMESTAMP(3),
    "category" TEXT,
    "method" TEXT,
    "important" BOOLEAN NOT NULL DEFAULT false,
    "calendarExported" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DueDate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "duoId" TEXT,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT,
    "method" TEXT,
    "note" TEXT,
    "important" BOOLEAN NOT NULL DEFAULT false,
    "calendarExported" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DueDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Installment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "duoId" TEXT,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "current" INTEGER NOT NULL DEFAULT 1,
    "nextDate" TIMESTAMP(3) NOT NULL,
    "category" TEXT,
    "method" TEXT,
    "important" BOOLEAN NOT NULL DEFAULT false,
    "calendarExported" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringPayment_duoId_idx" ON "RecurringPayment"("duoId");

-- CreateIndex
CREATE INDEX "RecurringPayment_userId_idx" ON "RecurringPayment"("userId");

-- CreateIndex
CREATE INDEX "DueDate_duoId_idx" ON "DueDate"("duoId");

-- CreateIndex
CREATE INDEX "DueDate_userId_idx" ON "DueDate"("userId");

-- CreateIndex
CREATE INDEX "Installment_duoId_idx" ON "Installment"("duoId");

-- CreateIndex
CREATE INDEX "Installment_userId_idx" ON "Installment"("userId");

-- AddForeignKey
ALTER TABLE "RecurringPayment" ADD CONSTRAINT "RecurringPayment_duoId_fkey" FOREIGN KEY ("duoId") REFERENCES "Duo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringPayment" ADD CONSTRAINT "RecurringPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueDate" ADD CONSTRAINT "DueDate_duoId_fkey" FOREIGN KEY ("duoId") REFERENCES "Duo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DueDate" ADD CONSTRAINT "DueDate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_duoId_fkey" FOREIGN KEY ("duoId") REFERENCES "Duo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
