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
import fs   from "node:fs"
import path from "node:path"

const DIR = path.join(process.cwd(), "app", "api", "admin")

function rotasAdmin(): { nome: string; fonte: string }[] {
  const achadas: { nome: string; fonte: string }[] = []
  const andar = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const cheio = path.join(dir, e.name)
      if (e.isDirectory()) andar(cheio)
      else if (e.name === "route.ts") {
        achadas.push({
          nome:  path.relative(DIR, cheio).replace(/\\/g, "/"),
          fonte: fs.readFileSync(cheio, "utf8"),
        })
      }
    }
  }
  andar(DIR)
  return achadas
}

describe("guard das rotas de admin", () => {
  const rotas = rotasAdmin()

  it("existem rotas admin para verificar", () => {
    // Sem isto, um erro de caminho faria o teste passar varrendo nada.
    expect(rotas.length).toBeGreaterThanOrEqual(15)
  })

  it.each(rotas.map((r) => r.nome))("%s checa o papel do admin", (nome) => {
    const rota = rotas.find((r) => r.nome === nome)!
    expect(rota.fonte).toMatch(/hasAdminRole|requireAdminRole|requireAdminApi/)
  })

  it("nenhuma rota para no `role !== \"ADMIN\"` sem checar o papel", () => {
    const grosso = /session\.user\.role\s*!==\s*["']ADMIN["']/
    const infratoras = rotas
      .filter((r) => grosso.test(r.fonte))
      .filter((r) => !/hasAdminRole|requireAdminRole|requireAdminApi/.test(r.fonte))
      .map((r) => r.nome)
    expect(infratoras).toEqual([])
  })

  it("🪤 as duas rotas que movem dinheiro exigem papel explícito", () => {
    // Guarda nomeada: se alguém afrouxar de volta para o guard genérico
    // justamente aqui, o teste diz qual rota e por quê.
    const dinheiro = ["disputes/[id]/route.ts", "bookings/[id]/late-fee/route.ts"]
    for (const nome of dinheiro) {
      const rota = rotas.find((r) => r.nome === nome)
      // Se a rota foi renomeada, o nome entra na mensagem — sem isso o teste
      // falharia com "cannot read fonte of undefined" e ninguem saberia qual.
      expect(rota ? nome : `${nome} NAO ENCONTRADA`).toBe(nome)
      expect(rota!.fonte).toMatch(/requireAdminApi\(\s*[\s\S]*?ADMIN_SUPERADMIN/)
    }
  })
})
