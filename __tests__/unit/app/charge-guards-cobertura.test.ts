/** @jest-environment node */
/**
 * Trava de COBERTURA das guardas de cobrança real (lib/payments/charge-guards.ts).
 *
 * O cabeçalho de charge-guards.ts lista os pontos que criam cobrança ao locatário,
 * levantados por Grep. Uma lista em comentário não impede um quarto ponto de nascer
 * sem guarda — e a chave live cobraria por fora do interruptor, em silêncio, com
 * todos os outros testes verdes. Este teste lê FONTE (mesmo estilo de
 * gtm-sem-dados-de-formulario.test.ts) e reprova quando:
 *
 *   1. surge, em app/ ou lib/, uma chamada que cria cobrança na Stripe fora dos
 *      arquivos conhecidos;
 *   2. um arquivo conhecido deixa de chamar a guarda, ou passa a chamá-la DEPOIS
 *      de criar a sessão;
 *   3. o cron de repasse volta a reescrever a condição "Connect ativo" em vez de
 *      usar `hasActiveConnect` (a guarda B só protege se as duas forem a mesma
 *      pergunta).
 *
 * NÃO pega: cobrança criada por um alias (`const { create } = stripe.checkout.sessions`),
 * por HTTP direto à API da Stripe, nem por código fora de app/ e lib/.
 */
import fs from "node:fs"
import path from "node:path"

const RAIZ = path.resolve(__dirname, "../../..")

/** Chamadas da Stripe que CRIAM cobrança ao locatário. `transfers.create` é repasse: fora. */
const CRIA_COBRANCA = /\b(?:checkout\s*\.\s*sessions|paymentIntents|charges|paymentLinks|invoices|subscriptions)\s*\.\s*create\s*\(/

/** arquivo → a guarda que tem de rodar antes da criação da sessão. */
const PONTOS_DE_COBRANCA: Record<string, string> = {
  "app/api/payments/checkout/route.ts":  "checkChargeGuards(",
  "app/api/payments/extension/route.ts": "checkChargeGuards(",
  "lib/lateFee.ts":                      "isBillingOpen(",
}

function listarFontes(pasta: string): string[] {
  const dir = path.join(RAIZ, pasta)
  const achados: string[] = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = `${pasta}/${e.name}`
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue
      achados.push(...listarFontes(rel))
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      achados.push(rel)
    }
  }
  return achados
}

const ler = (rel: string) => fs.readFileSync(path.join(RAIZ, rel), "utf8")

/** Posição da 1ª ocorrência em linha de CÓDIGO (comentário não conta). */
function posicaoNoCodigo(fonte: string, procurado: string | RegExp): number {
  let offset = 0
  for (const linha of fonte.split("\n")) {
    const t = linha.trim()
    const ehComentario = t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")
    if (!ehComentario) {
      const i = typeof procurado === "string" ? linha.indexOf(procurado) : linha.search(procurado)
      if (i >= 0) return offset + i
    }
    offset += linha.length + 1
  }
  return -1
}

describe("guardas de cobrança real — cobertura por leitura de fonte", () => {
  const fontes = [...listarFontes("app"), ...listarFontes("lib")]

  it("a varredura enxerga o que deveria (a sonda alcança os pontos conhecidos)", () => {
    for (const rel of Object.keys(PONTOS_DE_COBRANCA)) expect(fontes).toContain(rel)
  })

  it("🪤 só os pontos conhecidos criam cobrança na Stripe — um quarto tem de se plugar em charge-guards", () => {
    const criam = fontes.filter((rel) => posicaoNoCodigo(ler(rel), CRIA_COBRANCA) >= 0).sort()
    expect(criam).toEqual(Object.keys(PONTOS_DE_COBRANCA).sort())
  })

  it.each(Object.entries(PONTOS_DE_COBRANCA))(
    "🪤 %s importa charge-guards e chama %s ANTES de criar a sessão",
    (rel, guarda) => {
      const fonte = ler(rel)
      expect(posicaoNoCodigo(fonte, '"@/lib/payments/charge-guards"')).toBeGreaterThanOrEqual(0)

      const daGuarda = posicaoNoCodigo(fonte, guarda)
      const daCriacao = posicaoNoCodigo(fonte, CRIA_COBRANCA)
      expect(daGuarda).toBeGreaterThanOrEqual(0)
      expect(daCriacao).toBeGreaterThanOrEqual(0)
      expect(daGuarda).toBeLessThan(daCriacao)
    },
  )

  it("🪤 o cron de repasse usa hasActiveConnect, não a condição reescrita à mão", () => {
    const cron = ler("app/api/cron/payout/route.ts")
    expect(posicaoNoCodigo(cron, "hasActiveConnect(")).toBeGreaterThanOrEqual(0)
    expect(posicaoNoCodigo(cron, /stripeConnectStatus\s*===\s*"ACTIVE"/)).toBe(-1)
  })
})
