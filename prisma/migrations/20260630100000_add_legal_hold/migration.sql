-- Migration: add_legal_hold (ADITIVA)
-- Implementa flag de retenção legal ("legal hold") por registro, conforme decisão
-- dos fundadores em 2026-06-30 (A4 — conformidade jurídica).
--
-- OBJETIVO: suspender o expurgo automático de registros sob ordem judicial, litígio
-- ou investigação. Os crons de expurgo (purge-access-logs, purge-admin-logs,
-- purge-consent-ips) PULAM registros com legalHold = TRUE.
--
-- COMO ACIONAR (apenas jurídico/compliance com acesso MFA ao Supabase Dashboard):
--
--   -- Colocar registro sob retenção legal:
--   UPDATE access_logs
--      SET "legalHold" = TRUE,
--          "legalHoldReason" = 'Ofício nº XXX — Delegacia YYY — 2026-06-30',
--          "legalHoldAt" = now()
--    WHERE id = '<id_do_registro>';
--
--   -- Por userId + período:
--   UPDATE access_logs
--      SET "legalHold" = TRUE,
--          "legalHoldReason" = 'Investigação criminal nº XXXX',
--          "legalHoldAt" = now()
--    WHERE "userId" = '<id_do_usuario>'
--      AND ts BETWEEN '2026-01-01' AND '2026-06-30';
--
--   -- Levantar retenção (após decisão judicial ou encerramento do processo):
--   UPDATE access_logs
--      SET "legalHold" = FALSE,
--          "legalHoldReason" = NULL,
--          "legalHoldAt" = NULL
--    WHERE id = '<id_do_registro>';
--
-- QUEM PODE ACIONAR: apenas jurídico/compliance com acesso ao painel do Supabase
-- (MFA obrigatório). Não há UI — ação intencional via SQL para evitar acionamentos
-- acidentais. Registrar qualquer acionamento em issue privado no repositório.
--
-- TABELAS COBERTAS:
--   1. access_logs         — expurgados integralmente após 180 dias (purge-access-logs)
--   2. admin_logs          — expurgados integralmente após 5 anos (purge-admin-logs)
--   3. contract_acceptances — IP/UA nullificados após 5 anos (purge-consent-ips)
--   4. founder_leads       — IP/UA nullificados após 5 anos (purge-consent-ips)
--   5. users               — consentIp nullificado após 5 anos (purge-consent-ips)
--      (users usa legalHoldConsent para distinguir do hold de conta, sem conflito)

-- ─── 1. access_logs ──────────────────────────────────────────────────────────

ALTER TABLE "access_logs"
  ADD COLUMN "legalHold"       BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN "legalHoldReason" TEXT,
  ADD COLUMN "legalHoldAt"     TIMESTAMPTZ;

-- Índice parcial: apenas registros sob hold (tipicamente poucos — busca O(1))
CREATE INDEX "access_logs_legal_hold_idx"
  ON "access_logs" ("legalHold")
  WHERE "legalHold" = TRUE;

COMMENT ON COLUMN "access_logs"."legalHold" IS
  'TRUE = registro sob retencao legal (ordem judicial/litigio). '
  'O cron purge-access-logs PULA este registro enquanto legalHold=TRUE. '
  'Acionar via SQL pelo juridico/compliance (ver migration para instrucoes).';

COMMENT ON COLUMN "access_logs"."legalHoldReason" IS
  'Descricao textual da ordem ou processo que motivou a retencao (ex.: "Oficio no 123"). '
  'Obrigatorio ao setar legalHold=TRUE para fins de trilha de auditoria.';

COMMENT ON COLUMN "access_logs"."legalHoldAt" IS
  'Timestamp UTC em que a retencao legal foi acionada.';

-- ─── 2. admin_logs ───────────────────────────────────────────────────────────

ALTER TABLE "admin_logs"
  ADD COLUMN "legalHold"       BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN "legalHoldReason" TEXT,
  ADD COLUMN "legalHoldAt"     TIMESTAMPTZ;

CREATE INDEX "admin_logs_legal_hold_idx"
  ON "admin_logs" ("legalHold")
  WHERE "legalHold" = TRUE;

COMMENT ON COLUMN "admin_logs"."legalHold" IS
  'TRUE = registro sob retencao legal. O cron purge-admin-logs PULA este registro.';

-- ─── 3. contract_acceptances ─────────────────────────────────────────────────

ALTER TABLE "contract_acceptances"
  ADD COLUMN "legalHold"       BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN "legalHoldReason" TEXT,
  ADD COLUMN "legalHoldAt"     TIMESTAMPTZ;

CREATE INDEX "contract_acceptances_legal_hold_idx"
  ON "contract_acceptances" ("legalHold")
  WHERE "legalHold" = TRUE;

COMMENT ON COLUMN "contract_acceptances"."legalHold" IS
  'TRUE = IP/UA NAO sao nullificados pelo cron purge-consent-ips enquanto sob hold.';

-- ─── 4. founder_leads ────────────────────────────────────────────────────────

ALTER TABLE "founder_leads"
  ADD COLUMN "legalHold"       BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN "legalHoldReason" TEXT,
  ADD COLUMN "legalHoldAt"     TIMESTAMPTZ;

CREATE INDEX "founder_leads_legal_hold_idx"
  ON "founder_leads" ("legalHold")
  WHERE "legalHold" = TRUE;

COMMENT ON COLUMN "founder_leads"."legalHold" IS
  'TRUE = consentIp/consentUserAgent NAO sao nullificados pelo cron purge-consent-ips.';

-- ─── 5. users (consentIp) ────────────────────────────────────────────────────
-- Coluna separada para nao conflitar com suspensao de conta (isActive=false).
-- Protege apenas o campo consentIp PF; nao afeta exclusao/anonimizacao da conta.

ALTER TABLE "users"
  ADD COLUMN "legalHoldConsent"       BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN "legalHoldConsentReason" TEXT,
  ADD COLUMN "legalHoldConsentAt"     TIMESTAMPTZ;

CREATE INDEX "users_legal_hold_consent_idx"
  ON "users" ("legalHoldConsent")
  WHERE "legalHoldConsent" = TRUE;

COMMENT ON COLUMN "users"."legalHoldConsent" IS
  'TRUE = consentIp NAO e nullificado pelo cron purge-consent-ips (PF). '
  'Distinto de suspensao de conta (isActive). Acionar via SQL pelo juridico.';
