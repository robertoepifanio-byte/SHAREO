-- Migration: add_biometric_consent_fields (ADITIVA)
-- Prova de consentimento específico para tratamento biométrico da selfie do KYC,
-- conforme decisão jurídica C1 (2026-06-30): a selfie é dado pessoal sensível de
-- natureza biométrica e exige consentimento específico e destacado (LGPD art. 11, II, "a").
--
-- Padrão análogo a contract_acceptances (versão + hash + IP + timestamp). Sem backfill:
-- usuários já verificados ficam com os campos NULL = "consentimento ainda não coletado";
-- o código re-pede no próximo upload quando a flag biometricConsentRequired estiver ligada.
--
-- Colunas nullable e SEM default → aditiva pura, não altera dados nem comportamento
-- existentes (a flag biometricConsentRequired default OFF mantém o fluxo de KYC atual).

ALTER TABLE "users"
  ADD COLUMN "idSelfieConsentAt"       TIMESTAMP(3),
  ADD COLUMN "idSelfieConsentVersion"  TEXT,
  ADD COLUMN "idSelfieConsentTextHash" TEXT,
  ADD COLUMN "idSelfieConsentIp"       TEXT;
