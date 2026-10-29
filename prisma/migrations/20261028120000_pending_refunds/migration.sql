-- Fila de reprocessamento de estornos (follow-up do #7, Red Team 2026-10-28).
--
-- Motivo: quando `emitCancellationRefund` falha (cancelamento de reserva ou
-- desfecho de disputa), a rota logava + alertava no Sentry, mas o valor devido
-- ficava só em `booking.refundAmount` e NADA o reprocessava — recuperação 100%
-- manual. Cada falha passa a enfileirar UMA linha aqui; o cron
-- `GET /api/cron/refund-reconcile` reexecuta o estorno (a idempotencyKey da
-- Stripe por `motivo+bookingId` evita estorno duplo).
--
-- A restrição UNIQUE (bookingId, motivo) é a peça central: (reserva, origem)
-- identifica UM estorno lógico, então o enfileiramento é um upsert sobre essa
-- chave — uma falha que se repete atualiza a linha em vez de criar duplicatas
-- que o cron dispararia em paralelo.

-- Reusa o enum EventQueueStatus já existente (filas StripeEventQueue/EmailQueue):
-- mesmo conceito de status de fila, um vocabulário só. Nenhum CREATE TYPE novo.

CREATE TABLE "pending_refunds" (
  "id"              TEXT NOT NULL,
  "bookingId"       TEXT NOT NULL,
  "paymentIntentId" TEXT NOT NULL,
  "amount"          INTEGER NOT NULL,
  "motivo"          TEXT NOT NULL,
  "status"          "EventQueueStatus" NOT NULL DEFAULT 'PENDING',
  "attempts"        INTEGER NOT NULL DEFAULT 0,
  "lastError"       TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "pending_refunds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pending_refunds_bookingId_motivo_key"
  ON "pending_refunds" ("bookingId", "motivo");

-- Cobre a consulta do cron e do painel: filtra por status e ordena por createdAt
-- (mesma convenção das filas irmãs).
CREATE INDEX "pending_refunds_status_createdAt_idx"
  ON "pending_refunds" ("status", "createdAt");

ALTER TABLE "pending_refunds"
  ADD CONSTRAINT "pending_refunds_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
