-- Remove o campo do fluxo de PIX manual da plataforma (chave PIX PESSOAL de um
-- dos fundadores, usada só para validar o checkout em staging — ver
-- lib/platform-config.ts `getPlatformPixConfig` / PlatformConfig.platformPix*).
--
-- ADR-028 (2026-08-19): decisão do sócio majoritário de excluir 100% este
-- caminho, não apenas desligá-lo. Era o risco regulatório mais exposto do
-- sistema (dinheiro de terceiros passando pela conta pessoal de um fundador) e
-- perde a função com o Stripe Connect (proprietário recebe pelos próprios
-- dados bancários via KYC do Connect, não mais pela chave da plataforma).
--
-- ⚠️ DESTRUTIVA: qualquer valor gravado em "pixDeclaredAt" é perdido. Seguro
-- aqui porque este caminho nunca esteve em produção (gated D4) — só dados de
-- teste em staging. As linhas correspondentes de PlatformConfig
-- (platformPixEnabled/platformPixKey/platformPixKeyType/platformPixHolder/
-- platformPixBank) devem ser apagadas manualmente da tabela "platform_configs"
-- em staging (são linhas de config, não colunas de schema — nada a migrar aqui).

ALTER TABLE "bookings" DROP COLUMN IF EXISTS "pixDeclaredAt";
