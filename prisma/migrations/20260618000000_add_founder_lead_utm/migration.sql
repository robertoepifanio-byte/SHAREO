-- Atribuição de campanha (UTM) em founder_leads:
--   utmSource/utmMedium/utmCampaign → canal/segmento/campanha de origem do lead
--   referrerUrl                     → URL de origem (auditoria de canal)
-- Campos opcionais e aditivos — não tocam dados existentes nem o enum `source`.
-- DDL idempotente — seguro em DB limpo e no staging.

ALTER TABLE "founder_leads"
  ADD COLUMN IF NOT EXISTS "utmSource"   TEXT,
  ADD COLUMN IF NOT EXISTS "utmMedium"   TEXT,
  ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT,
  ADD COLUMN IF NOT EXISTS "referrerUrl" VARCHAR(500);
