import {
  ANCORAS,
  CTA_HREF,
  EMBAIXADOR_TIERS,
  FAQ,
  FUNDADORES_VAGAS,
  NAV_LINKS,
  PRECOS,
  PRECOS_DISCLAIMER,
  TRILHAS,
} from "@/lib/landing-content"
import * as conteudo from "@/lib/landing-content"

/**
 * Guarda-corpo dos números da landing.
 *
 * Este arquivo existe porque cada número abaixo tem fonte da verdade em OUTRO
 * app — o marketplace, que esta landing não importa. Nada aqui quebra em
 * tempo de execução se divergir: a página renderiza normalmente com o valor
 * errado e ninguém percebe até um usuário cobrar a promessa. O teste é a única
 * amarração entre os dois lados.
 */

/** Diárias oficiais: CATEGORY_DATA em app/ganhar/_EarningsCalc.tsx. */
const DIARIAS_OFICIAIS: Record<string, number> = {
  ferramentas: 35,
  eletronicos: 100,
  "casa-jardim": 30,
  construcao: 45,
  esporte: 60,
  festas: 80,
}

/** Categorias que existem de fato no banco: prisma/seed.ts. */
const SLUGS_DO_SEED = ["ferramentas", "eletronicos", "casa-jardim", "construcao", "esporte", "festas"]

describe("Programa Embaixadores", () => {
  it("usa 2/3/5% — 3/5/7 está morto desde 12/08/2026 (lib/ambassador.ts)", () => {
    expect(EMBAIXADOR_TIERS.map((t) => t.percentual)).toEqual([2, 3, 5])
  })

  it("mantém as faixas de indicados alinhadas aos thresholds do produto", () => {
    expect(EMBAIXADOR_TIERS.map((t) => t.nome)).toEqual(["Bronze", "Prata", "Ouro"])
    expect(EMBAIXADOR_TIERS[0].faixa).toMatch(/1 a 10/)
    expect(EMBAIXADOR_TIERS[1].faixa).toMatch(/11 a 50/)
    expect(EMBAIXADOR_TIERS[2].faixa).toMatch(/50/)
  })

  it("explicita que o percentual incide sobre a comissão, não sobre o aluguel", () => {
    expect(conteudo.EMBAIXADORES_NOTA).toMatch(/comiss[ãa]o que a ShareO recebe/i)
    expect(conteudo.EMBAIXADORES_NOTA).toMatch(/n[ãa]o sobre o valor do aluguel/i)
  })
})

describe("Programa Fundadores", () => {
  it("mantém as 1.000 vagas da copy aprovada", () => {
    expect(FUNDADORES_VAGAS).toBe(1000)
  })
})

describe("Preços de referência", () => {
  it("só usa categorias que existem no seed", () => {
    for (const preco of PRECOS) {
      expect(SLUGS_DO_SEED).toContain(preco.slug)
    }
  })

  it("bate com as diárias oficiais do produto", () => {
    for (const preco of PRECOS) {
      expect(preco.diaria).toBe(DIARIAS_OFICIAIS[preco.slug])
    }
  })

  it("exibe casa-jardim pelo nome correto (slug legado)", () => {
    const casaJardim = PRECOS.find((p) => p.slug === "casa-jardim")
    expect(casaJardim?.nome).toBe("Eletrodomésticos")
  })

  it("deixa claro que quem define o preço é o anunciante", () => {
    expect(PRECOS_DISCLAIMER).toMatch(/anunciante/i)
  })
})

describe("Promessas que a landing não pode fazer", () => {
  /**
   * Varre TODO o texto exportado pelo módulo. Um teste por constante deixaria
   * a próxima constante nova desprotegida no dia em que alguém a acrescentar.
   */
  const textoInteiro = JSON.stringify(conteudo)

  it("não cita a taxa de plataforma — ela é configurável e este app não tem banco", () => {
    expect(textoInteiro).not.toMatch(/\b15\s*%/)
    expect(textoInteiro).not.toMatch(/taxa de (servi[çc]o|plataforma) de/i)
  })

  it("não promete taxa reduzida com percentual (nenhum valor existe no código)", () => {
    expect(textoInteiro).not.toMatch(/taxa reduzida de/i)
  })

  it("não ressuscita projeção de renda (removida por risco CDC art. 30/37)", () => {
    expect(textoInteiro).not.toMatch(/renda m[ée]dia/i)
    expect(textoInteiro).not.toMatch(/ganhe R\$/i)
    expect(textoInteiro).not.toMatch(/at[ée] R\$\s?\d/i)
  })
})

describe("Âncoras", () => {
  it("todo link da nav aponta para uma âncora declarada", () => {
    const ids = Object.values(ANCORAS)
    for (const link of NAV_LINKS) {
      expect(ids).toContain(link.href.replace("#", ""))
    }
  })

  it("o CTA aponta para o formulário", () => {
    expect(CTA_HREF).toBe("#founder-form")
  })
})

describe("Trilhas do como funciona", () => {
  it("tem quatro passos de cada lado", () => {
    expect(TRILHAS.tem.passos).toHaveLength(4)
    expect(TRILHAS.precisa.passos).toHaveLength(4)
  })
})

describe("FAQ", () => {
  it("abre deixando claro que o serviço ainda não está no ar", () => {
    expect(FAQ[0].r).toMatch(/ainda n[ãa]o/i)
  })

  it("não tem pergunta repetida", () => {
    const perguntas = FAQ.map((f) => f.p)
    expect(new Set(perguntas).size).toBe(perguntas.length)
  })
})
