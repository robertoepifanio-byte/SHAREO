// Fonte única dos metadados legais (Termos de Uso + Política de Privacidade).
// Centraliza o que antes estava hardcoded e divergente:
//   - RegisterForm.tsx ......... "v1.0"
//   - FounderCaptureForm.tsx ... "v1.1"
//   - app/api/founders/leads ... default("v1.0")
// Ao publicar uma nova versão dos documentos, atualizar SOMENTE aqui.

/** Versão vigente dos documentos legais aceitos no consentimento. */
export const CONSENT_VERSION = "v1.0"

/** Data da última atualização dos documentos (exibição amigável). */
export const POLICY_UPDATED_AT = "junho de 2026"

/** Canal do Encarregado de Dados (DPO) — LGPD art. 41. */
export const DPO_EMAIL = "privacidade@shareo.com.br"
