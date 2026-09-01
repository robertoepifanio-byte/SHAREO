-- PaymentIntent da cobranca avulsa da taxa de atraso.
--
-- Ate 01/09/2026 a multa por atraso era cobrada do locatario e ficava
-- INTEGRALMENTE com a plataforma: `criarPayoutDaReserva` monta o repasse a
-- partir de `ownerNetAmount`, que cobre locacao e extensao, e a multa nao
-- entrava em nenhuma fatia. Decisao de Roberto (01/09): a multa segue o mesmo
-- split da locacao (85/15 pela taxa vigente).
--
-- Guardar o PaymentIntent e obrigatorio, nao conveniencia: a Stripe exige
-- `source_transaction` em transferencia envolvendo o Brasil, e a multa vive
-- numa Checkout Session propria. Sem este campo o Transfer teria de sair da
-- cobranca da locacao, que nao tem esse dinheiro.

ALTER TABLE "bookings" ADD COLUMN "lateFeePaymentIntentId" TEXT;
