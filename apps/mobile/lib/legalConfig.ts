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
  /** `null` até o endereço da Receita ser confirmado — ver a JSDoc no site. */
  enderecoSede: null as string | null,
  emailContato: "suporte@shareo.com.br",
}

/** Espelha POLICY_UPDATED_AT de lib/legal-config.ts. */
export const POLICY_UPDATED_AT = "junho de 2026"
