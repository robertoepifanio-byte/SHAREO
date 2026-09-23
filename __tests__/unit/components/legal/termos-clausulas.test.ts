import { readFileSync } from "fs"
import { join } from "path"
import {
  clausulasIntermediacaoPagamento as clausulasSite,
  clausulasPld as pldSite,
  repassePctDe,
} from "../../../../packages/legal/src/termos-clausulas"
import {
  clausulasIntermediacaoPagamento as clausulasApp,
  clausulasPld as pldApp,
  repassePctDe as repassePctApp,
} from "../../../../apps/mobile/lib/termosClausulas"

const VALORES = { feePct: "15", payoutLabel: "3 dias", maxPorTransacao: "R$ 500,00" }
const texto = (v = VALORES) =>
  clausulasSite(v).flatMap((s) => [s.titulo, ...s.paragrafos]).join("\n")

describe("repassePctDe — a fatia do locador sai da taxa, nunca é cravada", () => {
  it.each([
    ["15", "85"],
    ["10", "90"],
    ["12,5", "87,5"],
    ["7,25", "92,75"],
  ])("taxa %s%% → repasse %s%%", (taxa, repasse) => {
    expect(repassePctDe(taxa)).toBe(repasse)
  })
})

describe("cláusulas 6 e 7 dos Termos (redação jurídica de 21/09/2026)", () => {
  it("6.2 afirma que a ShareO não adquire a propriedade dos valores do locador", () => {
    expect(texto()).toContain("A ShareO não adquire a propriedade dos valores destinados ao locador.")
  })

  it("6.7 afirma que a ShareO não presta serviços financeiros nem mantém contas de pagamento", () => {
    const t = texto()
    expect(t).toContain("não presta serviços financeiros aos usuários")
    expect(t).toContain("não mantém contas de pagamento em nome dos usuários")
  })

  it("interpola taxa, repasse, janela e teto — e mantém os dois últimos que o texto anterior já publicava", () => {
    const t = texto()
    expect(t).toContain("corresponde a 15% do valor da locação")
    expect(t).toContain("corresponderá, em regra, a 85% do valor da locação")
    expect(t).toContain("O repasse fica elegível 3 dias após a confirmação da devolução")
    expect(t).toContain("Cada transação está sujeita a um limite de R$ 500,00.")
  })

  it("com outra taxa, nenhum 15% sobra no texto (taxa desatualizada em Termos é problema de CDC)", () => {
    const t = texto({ ...VALORES, feePct: "10" })
    expect(t).toContain("corresponde a 10% do valor da locação")
    expect(t).toContain("corresponderá, em regra, a 90% do valor da locação")
    expect(t).not.toMatch(/15\s?%/)
    expect(t).not.toMatch(/\b85\s?%/)
  })

  it("tem as oito subcláusulas de cada seção, na ordem", () => {
    expect(clausulasSite(VALORES).map((s) => s.titulo.slice(0, 4))).toEqual(
      ["6.1.", "6.2.", "6.3.", "6.4.", "6.5.", "6.6.", "6.7.", "6.8."],
    )
    expect(pldSite().map((s) => s.titulo.slice(0, 4))).toEqual(
      ["7.1.", "7.2.", "7.3.", "7.4.", "7.5.", "7.6.", "7.7.", "7.8."],
    )
  })

  it("nenhum título nem parágrafo se repete (a chave do React depende disso)", () => {
    for (const secao of [clausulasSite(VALORES), pldSite()]) {
      const titulos = secao.map((s) => s.titulo)
      expect(new Set(titulos).size).toBe(titulos.length)
      for (const s of secao) expect(new Set(s.paragrafos).size).toBe(s.paragrafos.length)
    }
  })
})

describe("numeração das seções: site e app têm os mesmos títulos, na mesma ordem", () => {
  const raiz = join(__dirname, "../../../../")
  const site = readFileSync(join(raiz, "packages/legal/src/TermosConteudo.tsx"), "utf8")
  const app = readFileSync(join(raiz, "apps/mobile/app/termos.tsx"), "utf8")

  it("mesma lista de '<N>. <Título>' (renumerar um lado sem o outro reprova)", () => {
    const titulosSite = [...site.matchAll(/<h2[^>]*>(\d+\. [^<]+)<\/h2>/g)].map((m) => m[1].trim())
    const titulosApp = [...app.matchAll(/\n\s+(\d+\. [^\n<{]+)\n\s+<\/Text>/g)].map((m) => m[1].trim())

    expect(titulosSite).toHaveLength(11)
    expect(titulosApp).toEqual(titulosSite)
  })
})

describe("paridade site ↔ app: o espelho mobile não pode divergir do pacote", () => {
  it.each([
    ["15", "3 dias", "R$ 500,00"],
    ["12,5", "1 dia", "R$ 1.000,00"],
  ])("mesma saída com taxa %s", (feePct, payoutLabel, maxPorTransacao) => {
    const v = { feePct, payoutLabel, maxPorTransacao }
    expect(clausulasApp(v)).toEqual(clausulasSite(v))
    expect(repassePctApp(feePct)).toBe(repassePctDe(feePct))
  })

  it("mesmo texto de PLD/FT", () => {
    expect(pldApp()).toEqual(pldSite())
  })
})
