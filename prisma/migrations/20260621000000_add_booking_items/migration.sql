-- Story B (ADR-025): locação com vários itens do MESMO proprietário, no MESMO período.
-- Tabela "booking_items" é a fonte de verdade da disponibilidade e da composição de preço.
-- Aditiva + idempotente: o staging tem histórico de migração com drift (lição do KYB),
-- então usamos IF NOT EXISTS / DO-block para poder aplicar via `db execute` se preciso.

CREATE TABLE IF NOT EXISTS "booking_items" (
    "id"         TEXT NOT NULL,
    "bookingId"  TEXT NOT NULL,
    "itemId"     TEXT NOT NULL,
    "dailyPrice" INTEGER NOT NULL,
    "totalPrice" INTEGER NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "booking_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "booking_items_bookingId_itemId_key" ON "booking_items"("bookingId", "itemId");
CREATE INDEX IF NOT EXISTS "booking_items_bookingId_idx" ON "booking_items"("bookingId");
CREATE INDEX IF NOT EXISTS "booking_items_itemId_idx" ON "booking_items"("itemId");

-- FKs (ADD CONSTRAINT não aceita IF NOT EXISTS → DO-block idempotente)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_items_bookingId_fkey') THEN
    ALTER TABLE "booking_items"
      ADD CONSTRAINT "booking_items_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'booking_items_itemId_fkey') THEN
    ALTER TABLE "booking_items"
      ADD CONSTRAINT "booking_items_itemId_fkey"
      FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill: cada reserva existente vira 1 BookingItem espelhando seu item principal,
-- preservando a disponibilidade histórica. gen_random_uuid() é nativo no PG13+ (Supabase).
INSERT INTO "booking_items" ("id", "bookingId", "itemId", "dailyPrice", "totalPrice", "createdAt")
SELECT gen_random_uuid()::text, b."id", b."itemId", b."dailyPrice", b."totalPrice", b."createdAt"
FROM "bookings" b
WHERE NOT EXISTS (
  SELECT 1 FROM "booking_items" bi WHERE bi."bookingId" = b."id" AND bi."itemId" = b."itemId"
);
