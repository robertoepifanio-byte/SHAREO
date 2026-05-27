-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'REFUNDED', 'FAILED');

-- AlterTable
ALTER TABLE "bookings"
  ADD COLUMN "paymentStatus"         "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "stripeSessionId"       TEXT,
  ADD COLUMN "stripePaymentIntentId" TEXT,
  ADD COLUMN "paidAt"                TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_stripeSessionId_key" ON "bookings"("stripeSessionId");
