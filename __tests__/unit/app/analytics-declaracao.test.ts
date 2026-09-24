/**
 * A Política não pode declarar um analytics que não existe.
 *
 * 🪤 Em 04/09/2026 descobrimos que `/politicas` declarava o Google Analytics 4
 * como subprocessador ativo, com link de opt-out — e ele nunca tinha sido ligado
 * (variável ausente em todo ambiente, zero gtag nos sites no ar). O guard antigo
 * dependia de env var, então ligar era mudar algo fora do repositório e a
 * Política virava falsa sem nenhum commit mostrar.
 *
 * A trava `GA4_LIBERADO` traz a decisão para o código; este teste garante que
 * religar sem reescrever o texto quebre a CI.
 * Ver `docs/juridico/dpa-apuracao-2026-09-03.md`.
 */
import fs   from "node:fs"
import path from "node:path"

const RAIZ = path.resolve(__dirname, "../../..")
const ler  = (rel: string) => fs.readFileSync(path.join(RAIZ, rel), "utf8")

const COMPONENTES = [
  "components/analytics/GoogleAnalytics.tsx",
  "apps/campanha/components/analytics/GoogleAnalytics.tsx",
]

/**
 * Lê a trava do fonte exigindo um literal `true`/`false`. Importar a constante
 * seria mais curto, mas passaria verde se alguém escrevesse
 * `GA4_LIBERADO = process.env.X === "1"` — que é o defeito que a trava impede.
 */
function lerTrava(rel: string, nome = "GA4_LIBERADO"): boolean {
  const m = ler(rel).match(new RegExp(`export const ${nome}\\s*=\\s*(true|false)\\b`))
  if (!m) throw new Error(`${nome} não é literal em ${rel} — trava removida?`)
  return m[1] === "true"
}

const GTM_LIGADO = lerTrava("apps/campanha/components/analytics/GoogleTagManager.tsx", "GTM_LIBERADO")

describe("declaração de analytics", () => {
  it("a trava está desligada, e igual nas duas cópias", () => {
    expect(lerTrava(COMPONENTES[1])).toBe(lerTrava(COMPONENTES[0]))
    expect(lerTrava(COMPONENTES[0])).toBe(false)
  })

  // O texto das Políticas web mora em @shareo/legal desde 09/2026 — renderizado
  // igual pelo marketplace e pela landing da campanha. A declaração precisa
  // estar travada lá, não na página que só monta o chrome em volta.
  it.each(["packages/legal/src/PoliticasConteudo.tsx", "apps/mobile/app/politicas.tsx"])(
    "%s não oferece opt-out do GA",
    (rel) => {
      expect(ler(rel)).not.toMatch(/gaoptout/)
    },
  )

  // 🪤 Em 15/09/2026 o GTM entrou na landing (`GTM_LIBERADO = true`) e a Política
  // seguiu dizendo "não utilizamos analytics de terceiros" até 23/09 — a mesma
  // falha do GA4 em 04/09, com o sinal trocado. Ligado, o GTM tem de estar
  // declarado nos quatro textos, site e app; desligado, a declaração sobra
  // (declarar a mais não induz o titular a erro, declarar a menos induz).
  it.each([
    "packages/legal/src/PoliticasConteudo.tsx",
    "packages/legal/src/PrivacidadeConteudo.tsx",
    "apps/mobile/app/politicas.tsx",
    "apps/mobile/app/privacidade.tsx",
  ])("%s declara o GTM enquanto GTM_LIBERADO for true", (rel) => {
    if (GTM_LIGADO) expect(ler(rel)).toMatch(/Google Tag Manager/)
  })

  it("não carrega o GA nem com a variável de ambiente definida", () => {
    const antes = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TESTE123"
    try {
      jest.resetModules()
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { GoogleAnalytics } = require("@/components/analytics/GoogleAnalytics")
      expect(GoogleAnalytics({})).toBeNull()
    } finally {
      if (antes === undefined) delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
      else process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = antes
      jest.resetModules()
    }
  })
})
