-- Migration: add_item_rules_and_return_reminder
-- P2-51 — Adiciona campo `rules` ao modelo Item (regras do anunciante)
-- P2-48 — Adiciona valor RETURN_REMINDER ao enum NotificationType

-- Adiciona o campo rules ao modelo Item
ALTER TABLE "items"
  ADD COLUMN "rules" TEXT;

COMMENT ON COLUMN "items"."rules" IS 'Regras do anunciante exibidas na sidebar de reserva (P2-51)';

-- Adiciona o valor RETURN_REMINDER ao enum NotificationType (se não existir)
-- Nota: em PostgreSQL, ALTER TYPE ... ADD VALUE é idempotente a partir do 9.6+
-- mas não dentro de uma transação — usar IF NOT EXISTS
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'RETURN_REMINDER';

COMMENT ON TYPE "NotificationType" IS 'RETURN_REMINDER adicionado em P2-48 para lembretes de devolução via cron';
