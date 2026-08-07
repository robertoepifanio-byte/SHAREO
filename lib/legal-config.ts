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
 * `biometricConsentRequired` ligada (default OFF). Ver docs/juridico/spec-consentimento-biometria-c1.md.
 */
export const BIOMETRIC_CONSENT_VERSION = "biometric-v1.0"

/**
 * Versão do consentimento de MARKETING da lista de interessados (pré-lançamento).
 *
 * Ciclo próprio, independente de CONSENT_VERSION — mesmo racional do consentimento
 * biométrico acima: mudar o que a campanha pede não deveria forçar reaceite dos
 * Termos por todo mundo, nem misturar as duas trilhas de auditoria.
 *
 * Histórico:
 *   (sem versão própria) — até 2026-08-07 os leads gravavam CONSENT_VERSION ("v1.1"),
 *     sob um texto que falava SÓ de e-mail.
 *   marketing-v1.0 — passa a coletar telefone/WhatsApp; o texto abaixo diz isso
 *     explicitamente. Leads anteriores permanecem com "v1.1" e NÃO consentiram
 *     contato por WhatsApp — não incluir esses números em disparo por telefone.
 *
 * Alterar MARKETING_CONSENT_TEXT exige subir esta versão.
 */
export const MARKETING_CONSENT_VERSION = "marketing-v1.0"

/**
 * Texto exato do consentimento exibido no formulário de captação. Fonte única:
 * a UI renderiza esta constante, e é ela que MARKETING_CONSENT_VERSION versiona —
 * assim o que foi aceito é reconstituível a partir do valor gravado no lead.
 */
export const MARKETING_CONSENT_TEXT =
  "Concordo em receber comunicações sobre o lançamento do Shareo por e-mail e, " +
  "se eu informar meu telefone, por WhatsApp. Posso cancelar quando quiser — " +
  "todo e-mail nosso traz um link de cancelamento em um clique."

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
