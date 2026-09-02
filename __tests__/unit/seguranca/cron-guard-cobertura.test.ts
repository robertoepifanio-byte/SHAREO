/**
 * Toda rota que usa o CRON_SECRET autentica pelo guard compartilhado.
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
 * 🪤 O escopo é a app/api INTEIRA, não só app/api/cron: `admin/geocode-items`
 * também lê o CRON_SECRET e comparava à mão justamente por morar fora daquele
 * diretório — foi assim que escapou da unificação anterior.
 *
 * Este teste é de ARQUIVO, não de comportamento: ele varre o diretório e
 * reprova se uma rota nova nascer sem o guard — que é como a anterior passou.
 */
import { lerRotas, dirDaApp } from "@/test-utils/rotas"

const rotas    = lerRotas(dirDaApp("app", "api"))
const deCron   = rotas.filter((r) => r.nome.startsWith("cron/"))
const usamSecret = rotas.filter((r) => /process\.env\.CRON_SECRET/.test(r.fonte))

describe("guard das rotas de cron", () => {
  it("existem rotas de cron para verificar", () => {
    // Sem isto, um erro de caminho faria o teste passar varrendo nada.
    expect(deCron.length).toBeGreaterThanOrEqual(15)
  })

  it.each(deCron)("$nome usa assertCronAuth", ({ fonte }) => {
    // Exige a CHAMADA, não a menção: um comentário citando o guard não vale.
    // (Foi assim que este próprio teste deixou passar geocode-items uma vez.)
    expect(fonte).toMatch(/assertCronAuth\s*\(/)
  })

  it.each(deCron)("$nome NÃO lê segredo de query string", ({ fonte }) => {
    expect(fonte).not.toMatch(/searchParams\.get\(\s*["']secret["']\s*\)/)
  })

  it("🪤 nenhuma rota da app/api lê o CRON_SECRET direto", () => {
    // Vale para toda a app/api, não só app/api/cron — ver nota do cabeçalho.
    //
    // O invariante é "o segredo pertence ao guard", mais forte que "não compare
    // à mão": quem não toca em process.env.CRON_SECRET não tem como comparar
    // em tempo variável, e a regra não depende de eu prever a forma da
    // comparação errada. Hoje a lista é vazia — foi geocode-items que saiu
    // dela.
    expect(usamSecret.map((r) => r.nome)).toEqual([])
  })

  it("a varredura enxerga o guard onde ele existe", () => {
    // Âncora do teste acima: sem ela, um caminho errado devolveria zero rotas e
    // o "nenhuma infratora" passaria por não ter olhado nada. Ancoro pelo que
    // DEVE existir (chamadas ao guard), não pelo que deve estar vazio.
    const comGuard = rotas.filter((r) => /assertCronAuth\s*\(/.test(r.fonte))
    expect(comGuard.length).toBeGreaterThanOrEqual(15)
  })
})
