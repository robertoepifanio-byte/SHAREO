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
