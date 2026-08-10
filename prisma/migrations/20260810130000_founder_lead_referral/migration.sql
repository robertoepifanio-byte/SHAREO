-- Rastreio de indicação entre leads da campanha de pré-lançamento.
--
-- `source = REFERRAL` já existia, mas só registrava QUE houve indicação: o `ref`
-- da URL era lido para derivar o canal e depois descartado. Sem saber QUEM
-- indicou, o boca a boca — único canal disponível enquanto não há verba de mídia
-- — não é mensurável.
--
-- Guarda o CÓDIGO e não o id do lead: o link circula em WhatsApp aberto e não
-- pode expor identificador interno. Ver generateReferralCode() em lib/founders.ts.
--
-- ⚠️ Rastreio apenas. Recompensa por indicação é benefício financeiro e segue
-- bloqueada pelo D4; o programa de comissão vive em "referrals", sobre "users".
--
-- ADITIVA: nenhuma coluna existente é alterada. Leads anteriores ficam com
-- referral_code NULL — o formulário só oferece link de convite a quem tem código,
-- e a rota atribui um na próxima vez que o lead for gravado.

ALTER TABLE "founder_leads" ADD COLUMN IF NOT EXISTS "referral_code"    VARCHAR(16);
ALTER TABLE "founder_leads" ADD COLUMN IF NOT EXISTS "referred_by_code" VARCHAR(16);

-- Nomes seguem a convenção do Prisma (<tabela>_<coluna>_key / _idx), senão o
-- `migrate diff` acusa drift contra o schema.
CREATE UNIQUE INDEX IF NOT EXISTS "founder_leads_referral_code_key"
  ON "founder_leads" ("referral_code");

-- "quantos leads este código trouxe" — ranking de quem mais indicou.
CREATE INDEX IF NOT EXISTS "founder_leads_referred_by_code_idx"
  ON "founder_leads" ("referred_by_code");
