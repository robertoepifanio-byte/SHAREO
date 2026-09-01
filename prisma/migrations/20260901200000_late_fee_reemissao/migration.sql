-- Reemissao da cobranca da taxa de atraso.
--
-- Diagnostico de 01/09/2026 no staging: das 5 multas efetivamente cobradas,
-- TODAS as 5 sessoes de checkout expiraram sem pagamento. A cobranca vale 24h
-- (teto da Stripe para `expires_at`) e nada a reemitia: o cron so criava
-- sessao quando `lateFeeAmount` estava vazio, e ele proprio acabara de
-- preencher esse campo. Depois de 24h a divida virava incobravel — enquanto o
-- lembrete diario de atraso continuava saindo, agora sem nenhum link de
-- pagamento.
--
-- Estes campos separam "multa devida" de "cobranca emitida", que era a
-- confusao de origem.

ALTER TABLE "bookings"
  ADD COLUMN "lateFeeSessionId"        TEXT,
  ADD COLUMN "lateFeeSessionExpiresAt" TIMESTAMP(3);
