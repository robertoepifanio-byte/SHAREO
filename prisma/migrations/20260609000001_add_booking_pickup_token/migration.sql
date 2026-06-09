-- Migration: add pickupToken and pickupTokenUsedAt to Booking
-- Token gerado no pagamento, validado pelo proprietário na entrega.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "pickupToken"       VARCHAR(6);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "pickupTokenUsedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "bookings_pickupToken_key" ON bookings("pickupToken");
