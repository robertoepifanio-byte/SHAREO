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
 *   marketing-v1.1 — o texto deixa de prometer cancelamento "em um clique". O
 *     link do CORPO do e-mail passou a abrir uma confirmação, porque scanners
 *     corporativos (Defender SafeLinks e afins) abrem links automaticamente e
 *     descadastravam quem nunca clicou. O botão do provedor (header
 *     List-Unsubscribe, RFC 8058) segue em um clique.
 *
 *     🪤 O ESCOPO DO TRATAMENTO NÃO MUDOU — mesma finalidade, mesmos canais,
 *     mesmos dados. Mudou só a descrição do mecanismo de revogação, e ele ficou
 *     MAIS protetivo. Leads em marketing-v1.0 seguem válidos e NÃO precisam
 *     reconsentir: eles aceitaram um texto que era verdadeiro à época.
 *
 *     Lição registrada: texto de consentimento versionado não deve especificar
 *     mecânica de UX. "Um clique" amarrou uma declaração jurídica a um detalhe
 *     de implementação, e um ajuste de produto virou evento de compliance.
 *
 * Alterar MARKETING_CONSENT_TEXT exige subir esta versão.
 */
export const MARKETING_CONSENT_VERSION = "marketing-v1.1"

/**
 * Todas as versões de consentimento de marketing já aceitas pela plataforma,
 * em ordem cronológica. Usada para validar `consentVersion` no POST de leads —
 * somente strings deste conjunto entram no banco (trilha de auditoria LGPD).
 *
 * Ao publicar nova versão:
 *   1. Atualizar MARKETING_CONSENT_VERSION acima.
 *   2. Adicionar a nova constante a este array (mas NÃO remover as antigas —
 *      clientes desatualizados podem ainda enviá-las por um período de transição).
 *
 * Histórico:
 *   "v1.1"          — até 2026-08-07, leads gravavam CONSENT_VERSION por engano.
 *   "marketing-v1.0" — coleta telefone/WhatsApp; texto prometia "um clique".
 *   "marketing-v1.1" — versão vigente (descrição do cancelamento sem contagem
 *      de cliques). Leads em v1.0 seguem válidos: o escopo não mudou.
 */
export const KNOWN_MARKETING_CONSENT_VERSIONS = [
  "v1.1",              // legado — leads anteriores a 2026-08-07
  "marketing-v1.0",   // legado — texto prometia cancelamento "em um clique"
  "marketing-v1.1",   // versão vigente
] as const

export type MarketingConsentVersion = (typeof KNOWN_MARKETING_CONSENT_VERSIONS)[number]

/**
 * Texto exato do consentimento exibido no formulário de captação. Fonte única:
 * a UI renderiza esta constante, e é ela que MARKETING_CONSENT_VERSION versiona —
 * assim o que foi aceito é reconstituível a partir do valor gravado no lead.
 */
export const MARKETING_CONSENT_TEXT =
  "Concordo em receber comunicações sobre o lançamento do Shareo por e-mail e, " +
  "se eu informar meu telefone, por WhatsApp. Posso cancelar quando quiser — " +
  "todo e-mail nosso traz um link de cancelamento, sem precisar responder."

/**
 * Data da última atualização e identificação da PJ passaram a morar em
 * `@shareo/legal` (packages/legal), junto com o texto dos documentos: a landing
 * da campanha publica as mesmas páginas e não importa nada da raiz. Reexportadas
 * aqui para todo import antigo do marketplace continuar valendo.
 */
export { POLICY_UPDATED_AT, POLITICAS_UPDATED_AT, LEGAL_ENTITY } from "@shareo/legal"

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

// `LEGAL_ENTITY` mora em @shareo/legal — ver a reexportação no topo deste arquivo.
