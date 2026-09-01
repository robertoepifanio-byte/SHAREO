-- FounderLead.intent perde o DEFAULT 'proprietario'.
-- O porque esta em app/api/founders/leads/route.ts, junto do schema que passou
-- a exigir o campo. A coluna segue NOT NULL e nenhuma linha existente muda.
--
-- DROP DEFAULT so altera o catalogo — nao reescreve a tabela.
ALTER TABLE "founder_leads" ALTER COLUMN "intent" DROP DEFAULT;
