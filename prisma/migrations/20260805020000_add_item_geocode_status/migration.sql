-- Migration: add_item_geocode_status (ADITIVA)
-- Rastreamento de geocodificação para suportar retry automático via cron quando
-- a Mapbox API falha no momento da criação do item. Sem esta coluna, itens com
-- falha de geocode ficam com lat/lng=0 permanentemente e somem da busca por proximidade.
--
-- Itens existentes recebem default 'OK'. Backfill abaixo corrige quem já está
-- com lat/lng=0 (falha de geocode antiga, nunca reprocessada) para 'PENDING' —
-- sem isso, esses itens ficariam marcados 'OK' mesmo nunca tendo sido
-- geocodificados de verdade, e o cron novo nunca os pegaria.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'GeocodeStatus') THEN
    CREATE TYPE "GeocodeStatus" AS ENUM ('PENDING', 'OK', 'FAILED');
  END IF;
END $$;

ALTER TABLE "items"
  ADD COLUMN IF NOT EXISTS "geocodeStatus"      "GeocodeStatus" NOT NULL DEFAULT 'OK',
  ADD COLUMN IF NOT EXISTS "geocodeAttempts"    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "geocodeLastTriedAt" TIMESTAMP(3);

-- O cron de retry filtra por geocodeStatus='PENDING' e geocodeLastTriedAt;
-- este índice torna essa query eficiente.
CREATE INDEX IF NOT EXISTS "items_geocodeStatus_geocodeLastTriedAt_idx"
  ON "items"("geocodeStatus", "geocodeLastTriedAt");

-- Backfill: itens com 0,0 nunca foram geocodificados de verdade (import PJ
-- legado ou falha de create anterior a esta migration) — marca PENDING pra
-- o cron de retry pegá-los, em vez de ficarem invisíveis pra sempre.
UPDATE "items" SET "geocodeStatus" = 'PENDING'
  WHERE "latitude" = 0 AND "longitude" = 0 AND "deletedAt" IS NULL;
