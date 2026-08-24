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

/**
 * Identificação da pessoa jurídica que opera a plataforma.
 *
 * Obrigação legal, não enfeite: o CDC (art. 44) e o Decreto 7.962/2013 (art. 2º, I —
 * comércio eletrônico) exigem que razão social, CNPJ e endereço da sede apareçam
 * em local de destaque. Sem isso, os Termos ficam sujeitos a alegação de nulidade
 * já no primeiro dia de operação.
 *
 * Fonte única de propósito: os mesmos dados aparecem nos Termos, na Política de
 * Privacidade (onde identificam o CONTROLADOR, LGPD art. 9º, I) e em /politicas.
 * Três cópias literais divergiriam na primeira alteração de endereço. O app
 * espelha esta constante em `apps/mobile/lib/legalConfig.ts` (o app não importa
 * do pacote web) e um teste compara os dois valores.
 *
 * 🪤 `razaoSocial` é a da RECEITA, não a de rascunho. Os documentos jurídicos
 * escritos ANTES da constituição (RIPD, consentimento de biometria) dizem
 * "ShareO Marketplace de Aluguel Ltda." — nome que nunca existiu no registro.
 * O CNPJ 68.512.556/0001-09 saiu em 11/08/2026 com outra denominação. Num bloco
 * cuja única função é identificar a PJ, a razão social errada anula o propósito.
 */
const ENDERECO_SEDE = "Rua Pais Leme, 215, conj. 1713 — Pinheiros, São Paulo/SP, CEP 05424-150"

export const LEGAL_ENTITY = {
  razaoSocial: "SHAREO MARKETPLACE DE INTERMEDIACAO DE NEGOCIOS LTDA",
  cnpj: "68.512.556/0001-09",
  /**
   * Endereço da sede, conforme o **Comprovante de Inscrição e de Situação
   * Cadastral** da Receita (confirmado pelo fundador em 2026-08-24). Campos do
   * comprovante: R PAIS LEME · 215 · CONJ 1713 · 05.424-150 · PINHEIROS ·
   * SAO PAULO · SP.
   *
   * 🪤 A fonte é o comprovante, não busca em agregador de CNPJ — site de
   * terceiro fica desatualizado, e endereço errado aqui é o mesmo defeito da
   * razão social de rascunho que quase entrou (ver a nota acima).
   *
   * O tipo continua aceitando `null` de propósito: os componentes omitem a
   * linha em vez de renderizar vazio, e os testes exercitam os dois estados.
   */
  enderecoSede: ENDERECO_SEDE as string | null,
  emailContato: "suporte@shareo.com.br",
} as const
