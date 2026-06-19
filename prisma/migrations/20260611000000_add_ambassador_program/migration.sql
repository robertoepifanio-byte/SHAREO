-- Migration: add-ambassador-program
-- ADR: ADR-022-programa-embaixadores.md
-- Data: 2026-06-11
-- Aplicada via prisma db push (shadow DB tem bug de enum na migration anterior)
-- Marcar como applied: pnpm prisma migrate resolve --applied 20260611000000_add_ambassador_program

BEGIN;

-- ─── 1. Novos enums ──────────────────────────────────────────────────────────

CREATE TYPE "AmbassadorTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD');
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED');
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');

-- ─── 2. AMBASSADOR_COMMISSION em TransactionType ─────────────────────────────
-- ATENÇÃO (CLAUDE.md): ALTER TYPE ADD VALUE não pode estar na mesma transação
-- que UPDATE — como este bloco não faz UPDATE de TransactionType, está OK.

ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'AMBASSADOR_COMMISSION';

-- ─── 3. Novos valores em NotificationType ─────────────────────────────────────

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AMBASSADOR_COMMISSION';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'AMBASSADOR_TIER_UP';

-- ─── 4. Tabela ambassador_profiles ───────────────────────────────────────────

CREATE TABLE "ambassador_profiles" (
  "id"                            TEXT             NOT NULL,
  "userId"                        TEXT             NOT NULL,
  "currentTier"                   "AmbassadorTier" NOT NULL DEFAULT 'BRONZE',
  "activeReferralsCnt"            INTEGER          NOT NULL DEFAULT 0,
  "totalCommissionPendingCents"   INTEGER          NOT NULL DEFAULT 0,
  "totalCommissionPaidCents"      INTEGER          NOT NULL DEFAULT 0,
  "totalCommissionCancelledCents" INTEGER          NOT NULL DEFAULT 0,
  "pixKey"                        TEXT,
  "pixKeyType"                    "PixKeyType",
  "stripeConnectAccountId"        TEXT,
  "consentAt"                     TIMESTAMP(3)     NOT NULL,
  "consentVersion"                TEXT             NOT NULL DEFAULT 'v1.0',
  "consentIp"                     TEXT,
  "consentUserAgent"              VARCHAR(500),
  "revokedAt"                     TIMESTAMP(3),
  "createdAt"                     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                     TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ambassador_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ambassador_profiles_userId_key" ON "ambassador_profiles"("userId");
CREATE        INDEX "ambassador_profiles_currentTier_idx" ON "ambassador_profiles"("currentTier");

ALTER TABLE "ambassador_profiles"
  ADD CONSTRAINT "ambassador_profiles_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 5. Tabela referrals ─────────────────────────────────────────────────────

CREATE TABLE "referrals" (
  "id"          TEXT             NOT NULL,
  "referrerId"  TEXT             NOT NULL,
  "referredId"  TEXT             NOT NULL,
  "status"      "ReferralStatus" NOT NULL DEFAULT 'PENDING',
  "activatedAt" TIMESTAMP(3),
  "expiredAt"   TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "referrals_referredId_key"            ON "referrals"("referredId");
CREATE UNIQUE INDEX "referrals_referrerId_referredId_key" ON "referrals"("referrerId", "referredId");
CREATE        INDEX "referrals_referrerId_status_idx"     ON "referrals"("referrerId", "status");
CREATE        INDEX "referrals_status_activatedAt_idx"    ON "referrals"("status", "activatedAt");

ALTER TABLE "referrals"
  ADD CONSTRAINT "referrals_referrerId_fkey"
  FOREIGN KEY ("referrerId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "referrals"
  ADD CONSTRAINT "referrals_referredId_fkey"
  FOREIGN KEY ("referredId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── 6. Tabela ambassador_commissions ────────────────────────────────────────

CREATE TABLE "ambassador_commissions" (
  "id"                  TEXT               NOT NULL,
  "ambassadorProfileId" TEXT               NOT NULL,
  "ambassadorUserId"    TEXT               NOT NULL,
  "referralId"          TEXT               NOT NULL,
  "bookingId"           TEXT               NOT NULL,
  "tierSnapshot"        "AmbassadorTier"   NOT NULL,
  "tierPercentBp"       INTEGER            NOT NULL,
  "platformFeeAmount"   INTEGER            NOT NULL,
  "amountCents"         INTEGER            NOT NULL,
  "status"              "CommissionStatus" NOT NULL DEFAULT 'PENDING',
  "approvedAt"          TIMESTAMP(3),
  "paidAt"              TIMESTAMP(3),
  "cancelledAt"         TIMESTAMP(3),
  "cancelReason"        TEXT,
  "createdAt"           TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ambassador_commissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ambassador_commissions_bookingId_referralId_key" ON "ambassador_commissions"("bookingId", "referralId");
CREATE        INDEX "ambassador_commissions_profile_status_idx"        ON "ambassador_commissions"("ambassadorProfileId", "status");
CREATE        INDEX "ambassador_commissions_status_approvedAt_idx"     ON "ambassador_commissions"("status", "approvedAt");
CREATE        INDEX "ambassador_commissions_bookingId_idx"             ON "ambassador_commissions"("bookingId");

ALTER TABLE "ambassador_commissions"
  ADD CONSTRAINT "ambassador_commissions_ambassadorProfileId_fkey"
  FOREIGN KEY ("ambassadorProfileId") REFERENCES "ambassador_profiles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ambassador_commissions"
  ADD CONSTRAINT "ambassador_commissions_ambassadorUserId_fkey"
  FOREIGN KEY ("ambassadorUserId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ambassador_commissions"
  ADD CONSTRAINT "ambassador_commissions_referralId_fkey"
  FOREIGN KEY ("referralId") REFERENCES "referrals"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ambassador_commissions"
  ADD CONSTRAINT "ambassador_commissions_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "bookings"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── 7. Drop do programa antigo (ReferralCredit) ─────────────────────────────
-- referral_credits foi criada sem RLS (ADR-009), DROP TABLE direto funciona.
-- ⚠ PRODUÇÃO: executar scripts/communicate-credit-deprecation.ts ANTES deste DROP.

DROP TABLE IF EXISTS "referral_credits";

COMMIT;
