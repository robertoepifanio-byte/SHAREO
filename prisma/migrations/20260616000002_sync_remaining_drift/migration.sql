-- Reconciliação de drift restante (features sincronizadas ao staging via db push, sem
-- migration): check-in/out + fotos de booking, aceite de contrato, late fee, verificação
-- de e-mail, log de auditoria de fundadores, e ajustes de default/tipo/índice.
-- DDL idempotente — seguro em DB limpo (CI/prod cria tudo) e no staging (db push → no-op).

-- ── Enum novo ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "CheckPhase" AS ENUM ('CHECKIN', 'CHECKOUT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Colunas ──────────────────────────────────────────────────────────────────
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "contractSignedAt" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "lateFeeAmount"     INTEGER;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "respondedAt"       TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "returnedAt"        TIMESTAMP(3);
ALTER TABLE "bookings" ALTER COLUMN "pickupToken" SET DATA TYPE TEXT;

ALTER TABLE "founder_leads" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailTokenExpiresAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerifyToken"    TEXT;

-- ── Ajustes de default (idempotentes por natureza) ───────────────────────────
ALTER TABLE "ambassador_commissions" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "ambassador_profiles"    ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "referrals"              ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "items"                  ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- ── Tabelas ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "booking_photos" (
    "id"         TEXT          NOT NULL,
    "bookingId"  TEXT          NOT NULL,
    "url"        TEXT          NOT NULL,
    "phase"      "CheckPhase"  NOT NULL,
    "uploadedBy" TEXT          NOT NULL,
    "createdAt"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "booking_photos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "contract_acceptances" (
    "id"         TEXT         NOT NULL,
    "bookingId"  TEXT         NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress"  TEXT,
    "userAgent"  TEXT,
    CONSTRAINT "contract_acceptances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "founder_audit_logs" (
    "id"        TEXT         NOT NULL,
    "leadId"    TEXT,
    "userId"    TEXT,
    "action"    TEXT         NOT NULL,
    "metadata"  JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "founder_audit_logs_pkey" PRIMARY KEY ("id")
);

-- ── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX        IF NOT EXISTS "booking_photos_bookingId_idx"        ON "booking_photos"("bookingId");
CREATE UNIQUE INDEX IF NOT EXISTS "contract_acceptances_bookingId_key"  ON "contract_acceptances"("bookingId");
CREATE INDEX        IF NOT EXISTS "founder_audit_logs_leadId_idx"       ON "founder_audit_logs"("leadId");
CREATE INDEX        IF NOT EXISTS "founder_audit_logs_userId_idx"       ON "founder_audit_logs"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "users_emailVerifyToken_key"          ON "users"("emailVerifyToken");

-- ── Foreign keys (guarded) ───────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE "booking_photos"
    ADD CONSTRAINT "booking_photos_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "contract_acceptances"
    ADD CONSTRAINT "contract_acceptances_bookingId_fkey"
    FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Rename de índice (IF EXISTS — staging pode já estar renomeado via db push) ─
ALTER INDEX IF EXISTS "ambassador_commissions_profile_status_idx"
  RENAME TO "ambassador_commissions_ambassadorProfileId_status_idx";
