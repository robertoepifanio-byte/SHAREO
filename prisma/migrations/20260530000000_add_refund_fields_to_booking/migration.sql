-- Migration: add_refund_fields_to_booking
-- Adiciona campos para registrar o reembolso calculado pela política de cancelamento ShareO

ALTER TABLE "bookings"
  ADD COLUMN "refundAmount"  INTEGER,
  ADD COLUMN "refundPercent" INTEGER;

COMMENT ON COLUMN "bookings"."refundAmount"  IS 'Valor a reembolsar em centavos — calculado no momento do cancelamento pela política ShareO (null = não cancelado)';
COMMENT ON COLUMN "bookings"."refundPercent" IS 'Percentual de reembolso aplicado: 100 | 70 | 50 — conforme a antecedência do cancelamento';
