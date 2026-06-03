-- Migration: consolidate_item_status
-- Sugestão A: consolida status do item em enum único, removendo campo isActive.
--
-- Regras de migração de dados:
--   isActive=false AND deletedAt IS NOT NULL  → status = DELETED
--   isActive=false AND deletedAt IS NULL      → status = PAUSED
--   isActive=true  AND status = AVAILABLE     → status = AVAILABLE (sem mudança)
--   isActive=true  AND status = DRAFT         → status = DRAFT     (sem mudança)

-- 1. Adicionar valor DELETED ao enum (antes de usar nos UPDATEs)
ALTER TYPE "ItemStatus" ADD VALUE IF NOT EXISTS 'DELETED';

-- 2. Migrar dados: isActive=false + deletedAt preenchido → DELETED
UPDATE "items"
SET "status" = 'DELETED'
WHERE "isActive" = false AND "deletedAt" IS NOT NULL;

-- 3. Migrar dados: isActive=false + deletedAt NULL → PAUSED
UPDATE "items"
SET "status" = 'PAUSED'
WHERE "isActive" = false AND "deletedAt" IS NULL;

-- 4. Remover índice composto que inclui isActive
DROP INDEX IF EXISTS "items_status_isActive_isApproved_deletedAt_idx";
DROP INDEX IF EXISTS "items_isActive_isApproved_deletedAt_idx";

-- 5. Remover coluna isActive da tabela items
ALTER TABLE "items" DROP COLUMN IF EXISTS "isActive";

-- 6. Recriar índice sem isActive
CREATE INDEX IF NOT EXISTS "items_status_isApproved_deletedAt_idx"
  ON "items"("status", "isApproved", "deletedAt");
