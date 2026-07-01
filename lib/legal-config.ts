// Fonte única dos metadados legais (Termos de Uso + Política de Privacidade).
// Centraliza o que antes estava hardcoded e divergente:
//   - RegisterForm.tsx ......... "v1.0"
//   - FounderCaptureForm.tsx ... "v1.1"
//   - app/api/founders/leads ... default("v1.0")
// Ao publicar uma nova versão dos documentos, atualizar SOMENTE aqui.

/**
 * Versão vigente dos documentos legais aceitos no consentimento.
 * v1.1 (KYB leve PJ, ADR-024): nova cláusula de responsabilização do declarante PJ
 * e nova categoria de dados ("responsável legal de PJ") na Política de Privacidade.
 */
export const CONSENT_VERSION = "v1.1"

/**
 * Versão do TEXTO de consentimento específico para tratamento biométrico
 * (selfie do KYC) — LGPD art. 11, II, "a" (decisão C1, 2026-06-30).
 * Evolui em ciclo próprio, INDEPENDENTE de CONSENT_VERSION: alterar o texto do
 * consentimento da selfie (lib/legal/biometric-consent-text.ts) exige bump aqui,
 * mas não força reaceite dos Termos. Rascunho gated D4 — só usado com a flag
 * `biometricConsentRequired` ligada (default OFF). Ver docs/spec-consentimento-biometria-c1.md.
 */
export const BIOMETRIC_CONSENT_VERSION = "biometric-v1.0"

/** Data da última atualização dos documentos (exibição amigável). */
export const POLICY_UPDATED_AT = "junho de 2026"

/** Canal do Encarregado de Dados (DPO) — LGPD art. 41. */
export const DPO_EMAIL = "privacidade@shareo.com.br"

/**
 * Texto da declaração de vínculo exigida ao cadastrar uma Pessoa Jurídica (ADR-024 / M2).
 * Renderizado no checkbox do formulário e registrado junto com timestamp + IP.
 * Alterar este texto exige bump de CONSENT_VERSION (a declaração é auditada por versão).
 */
export const PJ_DECLARATION_TEXT =
  "Declaro, sob as penas da lei (art. 299 do Código Penal — falsidade ideológica), " +
  "que sou o(a) representante legal da pessoa jurídica do CNPJ informado, ou possuo " +
  "poderes formais para representá-la perante a ShareO, e respondo pelos atos " +
  "praticados nesta conta PJ. Reconheço que esta declaração é registrada com data, " +
  "hora e endereço IP para fins de prova, conforme a Política de Privacidade."
