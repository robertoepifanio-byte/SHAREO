-- Stripe Connect (split automático 85/15) — ADR-028, reverte a decisão de
-- migrar para Mercado Pago Modelo B (ADR-026). O Mercado Pago exigia que cada
-- proprietário abrisse conta própria no MP para receber via split, o que gerou
-- forte rejeição comercial. Com Stripe Connect (Custom/Express — decisão de
-- implementação ainda em aberto, ver ADR-028) o proprietário só fornece dados
-- bancários e passa por KYC, sem precisar abrir conta Stripe visível.
--
-- ADITIVA: nenhuma coluna existente é alterada. O código Mercado Pago
-- (mpPreferenceId/mpPaymentId em Booking, mpUserId/mpAccessToken/... em
-- OwnerPaymentAccount) permanece intacto e DORMENTE — a flag
-- PlatformConfig.mercadoPagoEnabled já tem default OFF no código
-- (lib/platform-config.ts), então nada muda em produção com esta migração.

-- CreateEnum
-- Guarda de idempotência (DO $$ ... EXCEPTION duplicate_object): igual às
-- colunas/índices abaixo (IF NOT EXISTS), para tolerar reaplicação manual do
-- SQL fora do `prisma migrate deploy` — já aconteceu neste projeto antes
-- (ver docs/STATUS.md, migration 20260622010000 aplicada à mão + `migrate resolve`).
DO $$ BEGIN
    CREATE TYPE "StripeConnectStatus" AS ENUM ('NOT_CONNECTED', 'ONBOARDING', 'ACTIVE', 'RESTRICTED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable: owner_payment_accounts — conexão Stripe Connect do proprietário
ALTER TABLE "owner_payment_accounts" ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT;
ALTER TABLE "owner_payment_accounts" ADD COLUMN IF NOT EXISTS "stripeConnectStatus" "StripeConnectStatus" NOT NULL DEFAULT 'NOT_CONNECTED';
ALTER TABLE "owner_payment_accounts" ADD COLUMN IF NOT EXISTS "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "owner_payment_accounts" ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "owner_payment_accounts" ADD COLUMN IF NOT EXISTS "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "owner_payment_accounts" ADD COLUMN IF NOT EXISTS "stripeDisabledReason" TEXT;
ALTER TABLE "owner_payment_accounts" ADD COLUMN IF NOT EXISTS "stripeConnectedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "owner_payment_accounts_stripeAccountId_key" ON "owner_payment_accounts"("stripeAccountId");

-- AlterTable: bookings — audita para qual connected account o split desta
-- reserva foi enviado (o locador pode reconectar/trocar de conta entre reservas)
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "stripeConnectedAccountId" TEXT;
