-- Migration: add activatedAt to Booking
-- Grava o horário real de retirada quando o locador executa mark_active.
-- endDate é recalculado a partir deste timestamp + totalDays no route handler.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP(3);
