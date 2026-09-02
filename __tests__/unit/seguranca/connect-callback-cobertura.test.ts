/**
 * Toda rota que identifica a conta pelo `?account=` da URL valida a assinatura.
 *
 * 🪤 `return` e `refresh` do Connect são as únicas rotas sem sessão do projeto:
 * no fluxo mobile o `return_url` da Stripe abre no navegador externo, sem
 * cookie nem Bearer, então não há `auth()` possível ali. Enquanto a conta vinha
 * só do query string, qualquer `acct_` digitado à mão era aceito — e o refresh
 * devolvia um link de onboarding hospedado para ele.
 *
 * Este teste é de ARQUIVO, irmão do admin-guard-cobertura: uma terceira rota de
 * callback pode nascer lendo `?account=` sem validar nada, e o CI passaria
 * verde. Aqui ela reprova.
 */
import fs   from "node:fs"
import path from "node:path"

const DIR = path.join(process.cwd(), "app", "api", "stripe")

function rotasDeCallback(): { nome: string; fonte: string }[] {
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
  // Só interessa quem identifica a conta pela URL — é aí que mora o risco.
  return achadas.filter((r) => /searchParams\.get\(\s*["']account["']\s*\)|lerCallbackDoConnect/.test(r.fonte))
}

describe("callbacks do Stripe Connect", () => {
  const rotas = rotasDeCallback()

  it("as duas rotas de callback conhecidas continuam sendo varridas", () => {
    // Sem esta âncora, renomear os diretórios faria o teste passar varrendo
    // nada — o modo de falha mais silencioso que um teste de arquivo tem.
    expect(rotas.map((r) => r.nome).sort()).toEqual([
      "connect/refresh/route.ts",
      "connect/return/route.ts",
    ])
  })

  it.each(rotas)("$nome valida a assinatura da URL", ({ fonte }) => {
    expect(fonte).toMatch(/lerCallbackDoConnect|verifyConnectCallbackSig/)
  })

  it.each(rotas)("$nome não lê a conta crua do query string", ({ fonte }) => {
    // Ler `account` à mão é o caminho que dispensa a verificação sem querer.
    expect(fonte).not.toMatch(/searchParams\.get\(\s*["']account["']\s*\)/)
  })
})
