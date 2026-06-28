-- Aceite eletrônico versionado do contrato de locação (Questão #6 — D4 Jurídico)
-- Migração ADITIVA — não altera colunas existentes em contract_acceptances.
-- Gated por flag PlatformConfig.rentalContractAcceptanceEnabled (default OFF).
--
-- contractVersion : versão do texto do contrato aceito (ex.: "v1.0-rascunho")
-- contractTextHash: SHA-256 do texto exibido ao locatário (prova de quê foi aceito)
-- ipAddress       : já existia; mantida sem alteração
-- userAgent       : já existia; mantida sem alteração

ALTER TABLE "contract_acceptances"
  ADD COLUMN "contractVersion"  TEXT,
  ADD COLUMN "contractTextHash" TEXT;

-- Índice para facilitar auditoria por versão de contrato
CREATE INDEX "contract_acceptances_contractVersion_idx"
  ON "contract_acceptances" ("contractVersion");
