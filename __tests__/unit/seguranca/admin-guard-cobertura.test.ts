/**
 * Toda rota de /api/admin checa o PAPEL do admin, não apenas `role === "ADMIN"`.
 *
 * O defeito que isto tranca: `disputes/[id]` e `bookings/[id]/late-fee` — as
 * duas rotas que decidem disputa e recalculam multa — paravam em
 *
 *     if (!session || session.user.role !== "ADMIN") → 403
 *
 * sem nunca olhar o `adminRole`. As outras 16 rotas admin já checavam o papel.
 * Consequências somadas:
 *
 *  1. `ADMIN_OPERACIONAL` podia reemitir cobrança de multa, que é ato
 *     financeiro pela matriz de papéis do CLAUDE.md.
 *  2. A suíte E2E cria contas `admin.e2e.<ts>@shareo-test.com` como
 *     OPERACIONAL e nunca as remove — em 01/09 havia 5 acumuladas. Cada uma
 *     era, por essas duas rotas, uma conta capaz de mexer em dinheiro.
 *  3. Um papel novo entraria valendo em ambas sem que ninguém as revisasse:
 *     `role === "ADMIN"` aceita o que ainda não existe.
 *
 * Este teste é de ARQUIVO, não de comportamento — ele varre o diretório e
 * reprova se uma rota admin nova nascer com o guard grosso, que é exatamente
 * como as duas anteriores passaram.
 */
import { lerRotas, dirDaApp } from "@/test-utils/rotas"

const rotas = lerRotas(dirDaApp("app", "api", "admin"))

describe("guard das rotas de admin", () => {

  it("existem rotas admin para verificar", () => {
    // Sem isto, um erro de caminho faria o teste passar varrendo nada.
    expect(rotas.length).toBeGreaterThanOrEqual(15)
  })

  // Os tres nomes sao os tres helpers que hoje convivem no repo. Isto NAO diz
  // que sao equivalentes: `requireAdminRole` lanca, `requireAdminApi` devolve a
  // resposta pronta e `hasAdminRole` e para quem precisa da sessao antes do
  // guard. A lista existe para nao reprovar rota que ja esta correta.
  it.each(rotas)("$nome checa o papel do admin", ({ fonte }) => {
    expect(fonte).toMatch(/(?:hasAdminRole|requireAdminRole|requireAdminApi)\s*\(/)
  })

  it("nenhuma rota para no `role !== \"ADMIN\"` sem checar o papel", () => {
    const grosso = /session\.user\.role\s*!==\s*["']ADMIN["']/
    const infratoras = rotas
      .filter((r) => grosso.test(r.fonte))
      .filter((r) => !/(?:hasAdminRole|requireAdminRole|requireAdminApi)\s*\(/.test(r.fonte))
      .map((r) => r.nome)
    expect(infratoras).toEqual([])
  })

  // Guarda nomeada: se alguem afrouxar de volta para o guard generico
  // justamente nas duas rotas que mexem em dinheiro, o teste diz qual e por que.
  it.each(["disputes/[id]/route.ts", "bookings/[id]/late-fee/route.ts"])(
    "🪤 %s exige papel explícito",
    (nome) => {
      expect(rotas.map((r) => r.nome)).toContain(nome)
      const rota = rotas.find((r) => r.nome === nome)!
      expect(rota.fonte).toMatch(/requireAdminApi\(\s*[\s\S]*?ADMIN_SUPERADMIN/)
    },
  )
})
