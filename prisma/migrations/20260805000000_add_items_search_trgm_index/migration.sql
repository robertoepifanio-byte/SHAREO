-- Migration: add_items_search_trgm_index (ADITIVA)
-- Busca textual em /itens e GET /api/items?search= usa `contains` (Prisma) →
-- ILIKE '%termo%' (wildcard à esquerda), que não usa índice B-tree — sequential
-- scan conforme o catálogo cresce. pg_trgm + índice GIN trigram suporta ILIKE
-- com wildcard nas duas pontas sem mudar a query do Prisma.
--
-- Achado do painel de auditoria de testes não-funcionais (eixo desempenho,
-- 2026-08-05, ambiente shareo-prod).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "items_title_trgm_idx"       ON "items" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "items_description_trgm_idx" ON "items" USING gin ("description" gin_trgm_ops);
