-- FIN-1.1 — Schema financeiro
-- ATENÇÃO: ALTER TYPE ... ADD VALUE não pode estar na mesma transação que os outros DDL.
-- Este arquivo está estruturado em dois blocos separados.

-- ─── Bloco 1: Novos enums e extensão de enum existente ───────────────────────
-- Executado FORA de transação (sem BEGIN/COMMIT) pois ADD VALUE não é transacional.

CREATE TYPE "DepositStatus" AS ENUM ('NONE', 'HELD', 'RELEASED', 'RETAINED');
CREATE TYPE "PixKeyType" AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM');
CREATE TYPE "PixAccountStatus" AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED');
CREATE TYPE "TransactionType" AS ENUM ('PAYMENT_RECEIVED', 'PLATFORM_FEE', 'OWNER_PAYOUT', 'REFUND', 'DISPUTE_HOLD');
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'BLOCKED');
CREATE TYPE "EventQueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- DISPUTED já existe no BookingStatus desde o schema inicial — linha abaixo é no-op
-- ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';

-- ─── Bloco 2: Alterações de tabela e criação de novas tabelas ─────────────────

BEGIN;

-- Campos financeiros na tabela bookings
ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "platformFeeRate"   INTEGER,
  ADD COLUMN IF NOT EXISTS "platformFeeAmount" INTEGER,
  ADD COLUMN IF NOT EXISTS "ownerNetAmount"    INTEGER,
  ADD COLUMN IF NOT EXISTS "stripeFee"         INTEGER,
  ADD COLUMN IF NOT EXISTS "depositStatus"     "DepositStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "stripeDisputeId"   TEXT;

-- Índice financeiro em bookings
CREATE INDEX IF NOT EXISTS "bookings_ownerId_paymentStatus_paidAt_idx"
  ON "bookings" ("ownerId", "paymentStatus", "paidAt");

-- OwnerPaymentAccount
CREATE TABLE IF NOT EXISTS "owner_payment_accounts" (
  "id"         TEXT         NOT NULL,
  "userId"     TEXT         NOT NULL,
  "pixKeyType" "PixKeyType" NOT NULL,
  "pixKey"     TEXT         NOT NULL,
  "holderName" TEXT         NOT NULL,
  "bankName"   TEXT,
  "status"     "PixAccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,

  CONSTRAINT "owner_payment_accounts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "owner_payment_accounts_userId_key" UNIQUE ("userId"),
  CONSTRAINT "owner_payment_accounts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- PlatformTransaction
CREATE TABLE IF NOT EXISTS "platform_transactions" (
  "id"          TEXT              NOT NULL,
  "bookingId"   TEXT              NOT NULL,
  "type"        "TransactionType" NOT NULL,
  "amount"      INTEGER           NOT NULL,
  "description" TEXT,
  "metadata"    JSONB,
  "createdAt"   TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "platform_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_transactions_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "bookings"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "platform_transactions_bookingId_idx"
  ON "platform_transactions" ("bookingId");

-- Payout
CREATE TABLE IF NOT EXISTS "payouts" (
  "id"                    TEXT         NOT NULL,
  "ownerPaymentAccountId" TEXT         NOT NULL,
  "bookingId"             TEXT         NOT NULL,
  "amount"                INTEGER      NOT NULL,
  "status"                "PayoutStatus" NOT NULL DEFAULT 'PENDING',
  "eligibleAfter"         TIMESTAMP(3) NOT NULL,
  "processedAt"           TIMESTAMP(3),
  "failureReason"         TEXT,
  "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"             TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payouts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payouts_ownerPaymentAccountId_fkey"
    FOREIGN KEY ("ownerPaymentAccountId") REFERENCES "owner_payment_accounts"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payouts_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "bookings"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "payouts_eligibleAfter_status_idx"
  ON "payouts" ("eligibleAfter", "status");

CREATE INDEX IF NOT EXISTS "payouts_ownerPaymentAccountId_status_idx"
  ON "payouts" ("ownerPaymentAccountId", "status");

-- PlatformConfig
CREATE TABLE IF NOT EXISTS "platform_configs" (
  "id"          TEXT         NOT NULL,
  "key"         TEXT         NOT NULL,
  "value"       TEXT         NOT NULL,
  "description" TEXT,
  "updatedBy"   TEXT,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "platform_configs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "platform_configs_key_key" UNIQUE ("key")
);

-- StripeEventQueue
CREATE TABLE IF NOT EXISTS "stripe_event_queue" (
  "id"            TEXT              NOT NULL,
  "stripeEventId" TEXT              NOT NULL,
  "type"          TEXT              NOT NULL,
  "payload"       JSONB             NOT NULL,
  "status"        "EventQueueStatus" NOT NULL DEFAULT 'PENDING',
  "attempts"      INTEGER           NOT NULL DEFAULT 0,
  "lastError"     TEXT,
  "processedAt"   TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "stripe_event_queue_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stripe_event_queue_stripeEventId_key" UNIQUE ("stripeEventId")
);

CREATE INDEX IF NOT EXISTS "stripe_event_queue_status_createdAt_idx"
  ON "stripe_event_queue" ("status", "createdAt");

COMMIT;
