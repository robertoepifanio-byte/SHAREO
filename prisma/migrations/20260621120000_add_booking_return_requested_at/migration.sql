-- AddColumn: returnRequestedAt em bookings
-- Separates "Devolução solicitada" (mark_returned, borrower) de
-- "Devolução confirmada" (confirm_return, owner) no histórico de eventos.
-- Antes desta migration, returnedAt era sobrescrito em ambas as ações.
-- Após: returnRequestedAt = momento do mark_returned; returnedAt = momento do confirm_return.

ALTER TABLE "bookings" ADD COLUMN "returnRequestedAt" TIMESTAMP(3);
