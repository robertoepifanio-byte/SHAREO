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
function lerTrava(rel: string): boolean {
  const m = ler(rel).match(/export const GA4_LIBERADO\s*=\s*(true|false)\b/)
  if (!m) throw new Error(`GA4_LIBERADO não é literal em ${rel} — trava removida?`)
  return m[1] === "true"
}

describe("declaração de analytics", () => {
  it("a trava está desligada, e igual nas duas cópias", () => {
    expect(lerTrava(COMPONENTES[1])).toBe(lerTrava(COMPONENTES[0]))
    expect(lerTrava(COMPONENTES[0])).toBe(false)
  })

  it.each(["app/politicas/page.tsx", "apps/mobile/app/politicas.tsx"])(
    "%s afirma que não há analytics de terceiros, e não oferece opt-out",
    (rel) => {
      const texto = ler(rel)
      expect(texto).toMatch(/não utiliza ferramentas de analytics de terceiros/)
      expect(texto).not.toMatch(/gaoptout/)
    },
  )

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
