// Fonte: lib/legal-config.ts (site)
//
// Espelho das constantes legais do site. O app não importa do pacote web —
// `@/*` do apps/mobile/tsconfig.json resolve só dentro de apps/mobile, e nenhum
// arquivo do app importa de fora dele. O padrão da casa é espelhar com
// procedência rastreável (apps/mobile/CLAUDE.md §2), e este arquivo existe para
// que o espelho tenha UMA casa: antes, `POLICY_UPDATED_AT` morava dentro de
// app/termos.tsx e `LEGAL_ENTITY` teria virado uma terceira cópia solta.
//
// 🪤 Espelho não avisa quando diverge. Por isso o teste do site
// (__tests__/unit/components/legal/IdentificacaoPrestador.test.tsx) lê ESTE
// arquivo e compara razão social e CNPJ com os do site. Mudar lá sem mudar aqui
// quebra o CI — que é exatamente o ponto, porque o modo de falha silencioso é o
// app exibir CNPJ desatualizado num documento legal até alguém abrir a tela.

/** Espelha LEGAL_ENTITY de lib/legal-config.ts. */
export const LEGAL_ENTITY = {
  razaoSocial: "SHAREO MARKETPLACE DE INTERMEDIACAO DE NEGOCIOS LTDA",
  cnpj: "68.512.556/0001-09",
  /** Do Comprovante de Situação Cadastral da Receita — ver a JSDoc no site. */
  enderecoSede: "Rua Pais Leme, 215, conj. 1713 — Pinheiros, São Paulo/SP, CEP 05424-150" as string | null,
  emailContato: "suporte@shareo.com.br",
}

/** Espelha CONSENT_VERSION de lib/legal-config.ts — versão dos TERMOS, usada no cadastro. */
export const CONSENT_VERSION = "v1.1"

/** Espelha DPO_EMAIL de lib/legal-config.ts — LGPD art. 41. */
export const DPO_EMAIL = "privacidade@shareo.com.br"

/**
 * Espelha MARKETING_CONSENT_VERSION de lib/legal-config.ts.
 *
 * 🪤 NÃO é CONSENT_VERSION. Gravar a versão dos Termos num lead de marketing
 * arquiva a pessoa sob um texto que ela nunca viu — era o que o app fazia até
 * 24/08/2026.
 */
export const MARKETING_CONSENT_VERSION = "marketing-v1.0"

/**
 * Espelha MARKETING_CONSENT_TEXT — é ESTE texto que a versão acima versiona.
 *
 * 🪤 Numa linha só de propósito: o teste de espelho compara a FONTE deste
 * arquivo, e quebrar a string em concatenação o reprovaria à toa.
 */
export const MARKETING_CONSENT_TEXT =
  "Concordo em receber comunicações sobre o lançamento do Shareo por e-mail e, se eu informar meu telefone, por WhatsApp. Posso cancelar quando quiser — todo e-mail nosso traz um link de cancelamento em um clique."

/** Espelha POLICY_UPDATED_AT de lib/legal-config.ts. */
export const POLICY_UPDATED_AT = "junho de 2026"

/**
 * Espelha PJ_DECLARATION_TEXT de lib/legal-config.ts.
 *
 * Texto da declaração de vínculo exigida ao cadastrar uma Pessoa Jurídica (ADR-024 / M2).
 * Alterar este texto no site exige bump de CONSENT_VERSION e atualização aqui.
 */
export const PJ_DECLARATION_TEXT =
  "Declaro, sob as penas da lei (art. 299 do Código Penal — falsidade ideológica), que sou o(a) representante legal da pessoa jurídica do CNPJ informado, ou possuo poderes formais para representá-la perante a ShareO, e respondo pelos atos praticados nesta conta PJ. Reconheço que esta declaração é registrada com data, hora e endereço IP para fins de prova, conforme a Política de Privacidade."
