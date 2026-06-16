-- Programa Fundadores (ADR-021) — reconciliação de drift.
-- Estes objetos existiam em schema.prisma e foram sincronizados ao staging via
-- `prisma db push`, mas NUNCA viraram migration. Um DB limpo construído por
-- `migrate deploy` (CI e futura produção) ficava sem eles → seed falhava com
-- `column "isFounder" of relation "users" does not exist`.
--
-- DDL idempotente (IF NOT EXISTS / DO-block) para ser seguro nos dois cenários:
--   • DB limpo (CI/prod): cria tudo.
--   • Staging (já existe via db push): no-op, e a migration é registrada como aplicada.

-- ── Enums ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "FounderWave" AS ENUM ('WAVE_1', 'WAVE_2', 'WAVE_3');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "LeadStatus" AS ENUM ('PENDING', 'INVITED', 'CONVERTED', 'UNSUBSCRIBED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "SignupSource" AS ENUM ('ORGANIC', 'VIP_LANDING', 'REFERRAL', 'GOOGLE_ADS', 'META_ADS');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── users: colunas do Programa Fundadores ───────────────────────────────────
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isFounder"        BOOLEAN       NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "founderWave"      "FounderWave";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "founderJoinedAt"  TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "customFeeRate"    INTEGER;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "searchBoost"      DOUBLE PRECISION;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signupSource"     "SignupSource" NOT NULL DEFAULT 'ORGANIC';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "signupSourceMeta" JSONB;

-- ── founder_leads ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "founder_leads" (
    "id"                 TEXT          NOT NULL,
    "email"              TEXT          NOT NULL,
    "name"               TEXT,
    "intent"             TEXT          NOT NULL DEFAULT 'proprietario',
    "queuePosition"      SERIAL        NOT NULL,
    "wave"               "FounderWave" NOT NULL DEFAULT 'WAVE_1',
    "status"             "LeadStatus"  NOT NULL DEFAULT 'PENDING',
    "source"             "SignupSource" NOT NULL DEFAULT 'VIP_LANDING',
    "marketingConsentAt" TIMESTAMP(3)  NOT NULL,
    "consentVersion"     TEXT          NOT NULL DEFAULT 'v1.0',
    "consentIp"          TEXT,
    "consentUserAgent"   VARCHAR(500),
    "convertedUserId"    TEXT,
    "invitedAt"          TIMESTAMP(3),
    "convertedAt"        TIMESTAMP(3),
    "createdAt"          TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3)  NOT NULL,
    CONSTRAINT "founder_leads_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "founder_leads_email_key"           ON "founder_leads"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "founder_leads_queuePosition_key"   ON "founder_leads"("queuePosition");
CREATE UNIQUE INDEX IF NOT EXISTS "founder_leads_convertedUserId_key" ON "founder_leads"("convertedUserId");
CREATE INDEX        IF NOT EXISTS "founder_leads_status_idx"          ON "founder_leads"("status");
CREATE INDEX        IF NOT EXISTS "founder_leads_createdAt_idx"       ON "founder_leads"("createdAt");

DO $$ BEGIN
  ALTER TABLE "founder_leads"
    ADD CONSTRAINT "founder_leads_convertedUserId_fkey"
    FOREIGN KEY ("convertedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── founder_benefits ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "founder_benefits" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "founder_benefits_wave_key_key" ON "founder_benefits"("wave", "key");
