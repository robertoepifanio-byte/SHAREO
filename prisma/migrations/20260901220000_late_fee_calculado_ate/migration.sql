-- Ate quando o atraso foi contado na cobranca vigente.
--
-- O calculo automatico da multa para no 30o dia (decisao de Roberto,
-- 01/09/2026) e o admin pode atualizar a divida depois. Sem esta data, o valor
-- exibido nao diz a que periodo se refere — a mesma multa de "R$ 45,00" pode
-- ser de 3 dias ou de 30, conforme quando foi calculada.

ALTER TABLE "bookings" ADD COLUMN "lateFeeCalculatedUntil" TIMESTAMP(3);
