-- Migration: add_email_queue (ADITIVA — NFR-BL7)
-- Fila de retry para e-mails críticos.
-- Espelha mercado_pago_event_queue sem coluna de event-id único:
-- e-mails não têm idempotência natural; duplicatas ocasionais são inofensivas.

CREATE TABLE "email_queue" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "payloadJson" JSONB NOT NULL,
    "status" "EventQueueStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_queue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "email_queue_status_createdAt_idx" ON "email_queue"("status", "createdAt");
