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
import { lerRotas, dirDaApp } from "@/test-utils/rotas"

// So interessa quem identifica a conta pela URL — e ai que mora o risco.
const rotas = lerRotas(dirDaApp("app", "api", "stripe")).filter((r) =>
  /searchParams\.get\(\s*["']account["']\s*\)|lerCallbackDoConnect/.test(r.fonte),
)

describe("callbacks do Stripe Connect", () => {

  it("as duas rotas de callback conhecidas continuam sendo varridas", () => {
    // Sem esta âncora, renomear os diretórios faria o teste passar varrendo
    // nada — o modo de falha mais silencioso que um teste de arquivo tem.
    expect(rotas.map((r) => r.nome).sort()).toEqual([
      "connect/refresh/route.ts",
      "connect/return/route.ts",
    ])
  })

  it.each(rotas)("$nome valida a assinatura da URL", ({ fonte }) => {
    expect(fonte).toMatch(/(?:lerCallbackDoConnect|verifyConnectCallbackSig)\s*\(/)
  })

  it.each(rotas)("$nome não lê a conta crua do query string", ({ fonte }) => {
    // Ler `account` à mão é o caminho que dispensa a verificação sem querer.
    expect(fonte).not.toMatch(/searchParams\.get\(\s*["']account["']\s*\)/)
  })
})
