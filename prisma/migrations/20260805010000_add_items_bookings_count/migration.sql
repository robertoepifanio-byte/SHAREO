-- Migration: add_items_bookings_count (ADITIVA)
-- Denormaliza a contagem total de reservas por item para suportar ORDER BY "Mais alugados"
-- sem subquery em tempo real. Antes: Prisma gerava `ORDER BY (SELECT COUNT(*) FROM bookings
-- WHERE bookings."itemId" = items.id) DESC` — scan de toda a tabela bookings a cada request
-- conforme o catálogo cresce (NFR-BL4, painel de auditoria de testes não-funcionais, 2026-08-05).
--
-- A coluna replica o comportamento do { bookings: { _count: "desc" } } do Prisma:
-- conta TODAS as reservas do item (item principal via Booking.itemId), independente de status —
-- sem filtro de status no ORDER BY original. Não é decrementada no cancelamento (paridade exata).
--
-- ADD COLUMN + UPDATE na mesma transação: seguro para colunas regulares.
-- A lição do projeto sobre transações problemáticas refere-se especificamente a
-- ALTER TYPE ... ADD VALUE (restrição de enum do PG), que não se aplica aqui.

ALTER TABLE "items" ADD COLUMN "bookingsCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "items_bookingsCount_idx" ON "items" ("bookingsCount" DESC);

-- Backfill: popula bookingsCount para itens que já têm reservas.
-- Items sem reserva ficam com o DEFAULT 0 (a cláusula WHERE EXISTS evita o UPDATE desnecessário).
UPDATE "items"
SET "bookingsCount" = (
  SELECT COUNT(*) FROM "bookings" WHERE "bookings"."itemId" = "items"."id"
)
WHERE EXISTS (
  SELECT 1 FROM "bookings" WHERE "bookings"."itemId" = "items"."id"
);
