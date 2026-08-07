-- Campanha nacional de pré-lançamento: o ranking que decide a(s) cidade(s)-piloto
-- precisa de granularidade de BAIRRO, e precisa parar de fragmentar por grafia.
--
-- Contexto do problema:
--   `city` sempre foi texto livre. "São Paulo", "sao paulo" e "SAO PAULO" viravam
--   três linhas distintas no /admin/fundadores — corrompendo exatamente a decisão
--   que a campanha existe para tomar. O formulário passa a capturar por CEP
--   (ViaCEP), que devolve bairro/cidade/UF já canônicos.
--
-- Por que colunas *_norm em vez de normalizar na leitura:
--   Normalizar na leitura obrigaria a carregar todos os leads em memória para
--   agrupar — que é justamente o gargalo que o painel tem hoje (findMany sem
--   paginação). Com a chave materializada, o painel usa groupBy no banco.
--
-- ADITIVA: nenhuma coluna existente é alterada ou removida; tudo nullable.
-- ADD COLUMN + UPDATE na mesma transação é seguro (a restrição conhecida do
-- projeto vale para ALTER TYPE ... ADD VALUE, não para ADD COLUMN).

ALTER TABLE "founder_leads" ADD COLUMN IF NOT EXISTS "cep"               CHAR(8);
ALTER TABLE "founder_leads" ADD COLUMN IF NOT EXISTS "neighborhood"      VARCHAR(120);
ALTER TABLE "founder_leads" ADD COLUMN IF NOT EXISTS "city_norm"         VARCHAR(120);
ALTER TABLE "founder_leads" ADD COLUMN IF NOT EXISTS "neighborhood_norm" VARCHAR(120);
ALTER TABLE "founder_leads" ADD COLUMN IF NOT EXISTS "address_source"    VARCHAR(10);
ALTER TABLE "founder_leads" ADD COLUMN IF NOT EXISTS "utmContent"        TEXT;
ALTER TABLE "founder_leads" ADD COLUMN IF NOT EXISTS "utmTerm"           TEXT;

-- Backfill da chave de agrupamento para os leads já existentes.
--
-- A expressão abaixo é o espelho EXATO de normalizePlace() em
-- lib/geo/normalize-place.ts, na mesma ordem de passos:
--   1. normalize(NFD)  → separa a letra base do diacrítico
--   2. remove não-ASCII → descarta o diacrítico SEM deixar separador
--                         (sem este passo, "São" viraria "sa o")
--   3. lower
--   4. [^a-z0-9]+ → " " → pontuação/hífen viram separador
--   5. btrim + NULLIF('') → string vazia grava NULL, não ""
--
-- Verificado contra o Postgres 17.6 do staging em 2026-08-07: 13/13 casos
-- convergem com a implementação TypeScript (São Paulo, Mogi-Mirim, Brasília,
-- Santa Bárbara d'Oeste, "---", "   ", …). Alterar um lado exige reverificar.
UPDATE "founder_leads"
SET "city_norm" = NULLIF(
      btrim(
        regexp_replace(
          lower(regexp_replace(normalize("city", NFD), '[^[:ascii:]]', '', 'g')),
          '[^a-z0-9]+', ' ', 'g'
        )
      ),
      ''
    )
WHERE "city" IS NOT NULL AND "city_norm" IS NULL;

-- `neighborhood` não existia antes desta migração, então não há o que backfillar.

-- Ranking de cidades-piloto (groupBy por região) no /admin/fundadores.
CREATE INDEX IF NOT EXISTS "founder_leads_state_city_norm_idx"
  ON "founder_leads" ("state", "city_norm");

-- Drill-down de bairro — só consultado com UF + cidade já filtrados, porque
-- agrupar bairro do Brasil inteiro seriam dezenas de milhares de grupos.
-- Nome segue a convenção do Prisma (<tabela>_<colunas>_idx) para não gerar drift.
CREATE INDEX IF NOT EXISTS "founder_leads_state_city_norm_neighborhood_norm_idx"
  ON "founder_leads" ("state", "city_norm", "neighborhood_norm");
