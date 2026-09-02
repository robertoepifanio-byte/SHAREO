/**
 * Toda rota de cron autentica pelo guard compartilhado.
 *
 * O defeito que isto tranca: `/api/cron/reengagement` era a ÚNICA das 15 a
 * autenticar por QUERY STRING (`?secret=`), com comparação `!==` simples.
 * Consequências somadas:
 *
 *  1. O Vercel Cron autentica por header `Authorization: Bearer`, e a
 *     `vercel.json` chama o caminho SEM query string — toda execução agendada
 *     respondia 401. O job nunca rodou.
 *  2. Segredo em URL vai para log (access log, histórico, referrer). E é o
 *     MESMO `CRON_SECRET` das outras 14 rotas: vazando ali, cai junto o cron
 *     de repasse, o de expurgo e o de cobrança.
 *  3. `!==` compara em tempo variável; o guard usa `timingSafeEqual`.
 *
 * Este teste é de ARQUIVO, não de comportamento: ele varre o diretório e
 * reprova se uma rota nova nascer sem o guard — que é como a anterior passou.
 */
import fs   from "node:fs"
import path from "node:path"

const DIR = path.join(process.cwd(), "app", "api", "cron")

function rotasDeCron(): { nome: string; fonte: string }[] {
  return fs.readdirSync(DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({ nome: e.name, arquivo: path.join(DIR, e.name, "route.ts") }))
    .filter((r) => fs.existsSync(r.arquivo))
    .map((r) => ({ nome: r.nome, fonte: fs.readFileSync(r.arquivo, "utf8") }))
}

describe("guard das rotas de cron", () => {
  const rotas = rotasDeCron()

  it("existem rotas de cron para verificar", () => {
    // Sem isto, um erro de caminho faria o teste passar varrendo nada.
    expect(rotas.length).toBeGreaterThanOrEqual(15)
  })

  it.each(rotas.map((r) => r.nome))("%s usa assertCronAuth", (nome) => {
    const rota = rotas.find((r) => r.nome === nome)!
    expect(rota.fonte).toContain("assertCronAuth")
  })

  it.each(rotas.map((r) => r.nome))("%s NÃO lê segredo de query string", (nome) => {
    const rota = rotas.find((r) => r.nome === nome)!
    expect(rota.fonte).not.toMatch(/searchParams\.get\(\s*["']secret["']\s*\)/)
  })

  it("nenhuma rota compara o CRON_SECRET à mão", () => {
    // A comparação direta ignora o `timingSafeEqual` do guard.
    const infratoras = rotas
      .filter((r) => /[!=]==\s*process\.env\.CRON_SECRET|process\.env\.CRON_SECRET\s*[!=]==/.test(r.fonte))
      .map((r) => r.nome)
    expect(infratoras).toEqual([])
  })
})
