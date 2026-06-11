-- Migration: add-founder-program
-- ADR: ADR-021-programa-fundadores.md
-- Data: 2026-06-11
--
-- Aplicar nos dois projetos Supabase:
--   Local:   jtianehxosfdrhjzqvqj  (DATABASE_URL do .env)
--   Staging: fflpuoluiqmhpvcxubqi  (DATABASE_URL do .env.staging-migrate)
--
-- Via Prisma (recomendado, gera migration rastreável):
--   pnpm prisma migrate dev --name add-founder-program           # local
--   dotenv -e .env.staging-migrate -- pnpm prisma migrate deploy  # staging
--
-- Ou executar este SQL manualmente no Supabase SQL Editor.

-- ─── 1. Novos enums ──────────────────────────────────────────────────────────

CREATE TYPE "FounderWave" AS ENUM ('WAVE_1', 'WAVE_2', 'WAVE_3');
CREATE TYPE "LeadStatus"  AS ENUM ('PENDING', 'INVITED', 'CONVERTED', 'UNSUBSCRIBED');
CREATE TYPE "SignupSource" AS ENUM ('ORGANIC', 'VIP_LANDING', 'REFERRAL', 'GOOGLE_ADS', 'META_ADS');

-- ─── 2. Novos campos em users ─────────────────────────────────────────────────

ALTER TABLE "users"
  ADD COLUMN "isFounder"        BOOLEAN          NOT NULL DEFAULT false,
  ADD COLUMN "founderWave"      "FounderWave",
  ADD COLUMN "founderJoinedAt"  TIMESTAMP(3),
  ADD COLUMN "customFeeRate"    INTEGER,
  ADD COLUMN "searchBoost"      DOUBLE PRECISION,
  ADD COLUMN "signupSource"     "SignupSource"    NOT NULL DEFAULT 'ORGANIC',
  ADD COLUMN "signupSourceMeta" JSONB;

-- ─── 3. Tabela founder_leads ──────────────────────────────────────────────────

CREATE TABLE "founder_leads" (
  "id"                 TEXT         NOT NULL,
  "email"              TEXT         NOT NULL,
  "name"               TEXT,
  "intent"             TEXT         NOT NULL DEFAULT 'proprietario',
  "queuePosition"      SERIAL       NOT NULL,
  "wave"               "FounderWave" NOT NULL DEFAULT 'WAVE_1',
  "status"             "LeadStatus"  NOT NULL DEFAULT 'PENDING',
  "source"             "SignupSource" NOT NULL DEFAULT 'VIP_LANDING',
  "marketingConsentAt" TIMESTAMP(3) NOT NULL,
  "consentVersion"     TEXT         NOT NULL DEFAULT 'v1.0',
  "consentIp"          TEXT,
  "consentUserAgent"   VARCHAR(500),
  "convertedUserId"    TEXT,
  "invitedAt"          TIMESTAMP(3),
  "convertedAt"        TIMESTAMP(3),
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt"          TIMESTAMP(3),
  CONSTRAINT "founder_leads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "founder_leads_email_key"           ON "founder_leads"("email");
CREATE UNIQUE INDEX "founder_leads_queuePosition_key"   ON "founder_leads"("queuePosition");
CREATE UNIQUE INDEX "founder_leads_convertedUserId_key" ON "founder_leads"("convertedUserId");
CREATE INDEX        "founder_leads_status_idx"          ON "founder_leads"("status");
CREATE INDEX        "founder_leads_createdAt_idx"       ON "founder_leads"("createdAt");

ALTER TABLE "founder_leads"
  ADD CONSTRAINT "founder_leads_convertedUserId_fkey"
  FOREIGN KEY ("convertedUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 4. Tabela founder_benefits ───────────────────────────────────────────────

CREATE TABLE "founder_benefits" (
  "id"             TEXT          NOT NULL,
  "wave"           "FounderWave" NOT NULL,
  "key"            TEXT          NOT NULL,
  "value"          TEXT          NOT NULL,
  "description"    TEXT,
  "active"         BOOLEAN       NOT NULL DEFAULT true,
  "effectiveFrom"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "effectiveUntil" TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "founder_benefits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "founder_benefits_wave_key_key" ON "founder_benefits"("wave", "key");

-- ─── 5. Tabela founder_audit_logs ─────────────────────────────────────────────

CREATE TABLE "founder_audit_logs" (
  "id"        TEXT         NOT NULL,
  "leadId"    TEXT,
  "userId"    TEXT,
  "action"    TEXT         NOT NULL,
  "metadata"  JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "founder_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "founder_audit_logs_leadId_idx" ON "founder_audit_logs"("leadId");
CREATE INDEX "founder_audit_logs_userId_idx" ON "founder_audit_logs"("userId");
