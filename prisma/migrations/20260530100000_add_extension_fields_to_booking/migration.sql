-- Migration: add_extension_fields_to_booking
-- P1-27 — Adiciona campos para solicitação de extensão de prazo em reservas

ALTER TABLE "bookings"
  ADD COLUMN "extensionRequestedEndDate" TIMESTAMP(3),
  ADD COLUMN "extensionStatus"           TEXT,
  ADD COLUMN "extensionRequestedAt"      TIMESTAMP(3),
  ADD COLUMN "extensionRespondedAt"      TIMESTAMP(3);

COMMENT ON COLUMN "bookings"."extensionRequestedEndDate" IS 'Nova data de devolução solicitada pelo locatário via P1-27';
COMMENT ON COLUMN "bookings"."extensionStatus"           IS 'Estado da solicitação de extensão: PENDING | APPROVED | REJECTED';
COMMENT ON COLUMN "bookings"."extensionRequestedAt"      IS 'Timestamp em que o locatário fez a solicitação de extensão';
COMMENT ON COLUMN "bookings"."extensionRespondedAt"      IS 'Timestamp em que o proprietário respondeu à solicitação de extensão';
