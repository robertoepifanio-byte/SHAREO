-- ATOR-03 — cobrar as diárias estendidas, e repassá-las ao proprietário.
--
-- Aprovar uma extensão de prazo não cobrava nada: o `endDate` era empurrado e
-- `totalDays`/`totalPrice`/split ficavam como estavam. O proprietário emprestava
-- mais dias de graça e o repasse saía calculado sobre o valor antigo.
--
-- Decisão do fundador (24/08): a extensão só vale DEPOIS de paga. A aprovação
-- grava o valor das diárias extras; o `endDate` só se move quando o pagamento
-- confirma. (Exceção: reserva que ainda não estava paga apenas recalcula os
-- totais — o checkout normal cobra tudo junto.)
--
-- 🪤 Por que `Payout.sourcePaymentIntentId` existe: a Stripe EXIGE
-- `source_transaction` em transferência envolvendo o Brasil, e ele liga a
-- transferência a UMA cobrança. As diárias extras estão em outra cobrança, então
-- não cabem no mesmo Transfer da locação — sem isto, o repasse pediria à Stripe
-- mais do que a cobrança original comporta: recusa em silêncio no cron, ou (em
-- extensão pequena) transferência que come a taxa da plataforma.
--
-- Aditiva: três colunas nullable, sem default, sem índice. Nenhuma linha
-- existente muda de comportamento — `sourcePaymentIntentId` nulo significa
-- exatamente o que todos os repasses anteriores fizeram (sacar da cobrança
-- original da locação).

ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "extensionAmountCents"     INTEGER,
  ADD COLUMN IF NOT EXISTS "extensionPaymentIntentId" TEXT;

ALTER TABLE "payouts"
  ADD COLUMN IF NOT EXISTS "sourcePaymentIntentId" TEXT;
