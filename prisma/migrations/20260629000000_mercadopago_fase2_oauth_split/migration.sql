-- Migration: mercadopago_fase2_oauth_split (ADITIVA)
-- Fase 2 do Mercado Pago (Modelo B / split via OAuth) — ADR-026.
-- Tudo nullable + tabela nova: zero impacto no fluxo atual. A integração só age
-- com a flag PlatformConfig.mercadoPagoEnabled = "true" (default OFF) + credenciais.
-- Produção gated por D4 (parecer FORMAL).

-- bookings: identificadores de pagamento do Mercado Pago
ALTER TABLE "bookings" ADD COLUMN     "mpPaymentId" TEXT,
ADD COLUMN     "mpPreferenceId" TEXT;

-- owner_payment_accounts: conexão OAuth do locador (tokens criptografados na app)
ALTER TABLE "owner_payment_accounts" ADD COLUMN     "mpAccessToken" TEXT,
ADD COLUMN     "mpConnectedAt" TIMESTAMP(3),
ADD COLUMN     "mpLiveMode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mpPublicKey" TEXT,
ADD COLUMN     "mpRefreshToken" TEXT,
ADD COLUMN     "mpTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "mpUserId" TEXT;

-- Fila idempotente de notificações do webhook do MP (espelha stripe_event_queue)
CREATE TABLE "mercado_pago_event_queue" (
    "id" TEXT NOT NULL,
    "mpEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "EventQueueStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mercado_pago_event_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mercado_pago_event_queue_mpEventId_key" ON "mercado_pago_event_queue"("mpEventId");

-- CreateIndex
CREATE INDEX "mercado_pago_event_queue_status_createdAt_idx" ON "mercado_pago_event_queue"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_mpPreferenceId_key" ON "bookings"("mpPreferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "owner_payment_accounts_mpUserId_key" ON "owner_payment_accounts"("mpUserId");
