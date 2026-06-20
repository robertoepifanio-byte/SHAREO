-- KYB leve PJ (ADR-024): situação cadastral do CNPJ na Receita (M1/M3) +
-- declaração auditada de responsável legal (M2). Colunas todas nullable, sem backfill.
-- DDL idempotente — seguro em DB limpo, no dev local e no staging.

-- Enum de situação cadastral (CREATE TYPE não é idempotente nativamente).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CnpjSituacao') THEN
    CREATE TYPE "CnpjSituacao" AS ENUM ('ATIVA', 'SUSPENSA', 'INAPTA', 'BAIXADA', 'NULA');
  END IF;
END $$;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "cnpjRazaoSocial"               VARCHAR(150),
  ADD COLUMN IF NOT EXISTS "cnpjSituacao"                  "CnpjSituacao",
  ADD COLUMN IF NOT EXISTS "cnpjDataAbertura"              DATE,
  ADD COLUMN IF NOT EXISTS "cnpjSituacaoVerificada"        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "cnpjVerificadoAt"              TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cnpjResponsavelLegalEncrypted" TEXT,
  ADD COLUMN IF NOT EXISTS "cnpjDeclaracaoAt"              TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cnpjDeclaracaoIp"              TEXT,
  ADD COLUMN IF NOT EXISTS "cnpjDeclaracaoVersion"         TEXT,
  ADD COLUMN IF NOT EXISTS "cnpjVerificacaoOverrideBy"     TEXT,
  ADD COLUMN IF NOT EXISTS "cnpjVerificacaoOverrideAt"     TIMESTAMP(3);
