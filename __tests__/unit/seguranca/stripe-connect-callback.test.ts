/**
 * Assinatura dos callbacks de onboarding do Stripe Connect.
 *
 * O defeito que isto tranca: `/api/stripe/connect/refresh?account=acct_X` era
 * aceito sem sessão e sem prova nenhuma, e emitia um link de onboarding
 * hospedado da Stripe para o `acct_` que viesse na URL — link que coleta dados
 * bancários de repasse. Estes testes fixam as duas propriedades que a correção
 * depende: a assinatura amarra a CONTA, e um segredo diferente não passa.
 */
import crypto from "crypto"
import { connectCallbackSig, verifyConnectCallbackSig } from "@/lib/stripe-connect-callback"

const SEGREDO = "segredo-de-teste-nao-usar-em-lugar-nenhum"

describe("assinatura do callback do Connect", () => {
  const originalAuth = process.env.AUTH_SECRET
  const originalNext = process.env.NEXTAUTH_SECRET

  // O módulo lê a chave a cada chamada (não a captura no import), então trocar
  // a env entre os testes basta — sem resetModules.
  beforeEach(() => { process.env.AUTH_SECRET = SEGREDO })
  afterAll(() => {
    process.env.AUTH_SECRET     = originalAuth
    process.env.NEXTAUTH_SECRET = originalNext
  })

  it("aceita a assinatura que ela mesma emitiu", () => {
    const sig = connectCallbackSig("acct_123", "web")
    expect(verifyConnectCallbackSig("acct_123", "web", sig)).toBe(true)
  })

  it("🪤 a assinatura de uma conta NÃO vale para outra", () => {
    // Este é o ataque: trocar o acct_ na barra de endereços mantendo o resto.
    const sig = connectCallbackSig("acct_da_vitima", "web")
    expect(verifyConnectCallbackSig("acct_do_atacante", "web", sig)).toBe(false)
  })

  it("recusa quando não vem assinatura nenhuma", () => {
    // Formato antigo da URL, sem `sig` — precisa falhar, não passar por omissão.
    expect(verifyConnectCallbackSig("acct_123", "web", null)).toBe(false)
    expect(verifyConnectCallbackSig("acct_123", "web", "")).toBe(false)
  })

  it("recusa assinatura forjada com outro segredo", () => {
    const forjada = crypto
      .createHmac("sha256", "outro-segredo")
      .update("stripe-connect-callback-v1:acct_123:web")
      .digest("hex")
    expect(verifyConnectCallbackSig("acct_123", "web", forjada)).toBe(false)
  })

  it("recusa assinatura de tamanho diferente sem estourar", () => {
    // timingSafeEqual lança quando os buffers têm tamanhos diferentes.
    expect(() => verifyConnectCallbackSig("acct_123", "web", "curta")).not.toThrow()
    expect(verifyConnectCallbackSig("acct_123", "web", "curta")).toBe(false)
  })

  it("🪤 client desconhecido normaliza para web, e não vira brecha", () => {
    // A rota trata qualquer coisa != "mobile" como web; se a verificação não
    // normalizasse igual, `?client=qualquer-coisa` invalidaria um link legítimo.
    const sigWeb = connectCallbackSig("acct_123", "web")
    expect(verifyConnectCallbackSig("acct_123", "xpto", sigWeb)).toBe(true)
    expect(verifyConnectCallbackSig("acct_123", null,   sigWeb)).toBe(true)
    // ...mas mobile continua sendo um contexto distinto.
    expect(verifyConnectCallbackSig("acct_123", "mobile", sigWeb)).toBe(false)
  })

  it("sem AUTH_SECRET, fecha em vez de abrir", () => {
    // Chave ausente já passou 25 dias despercebida em produção (lib/crypto.ts).
    // O desfecho seguro é recusar, nunca liberar por falta de configuração.
    delete process.env.AUTH_SECRET
    delete process.env.NEXTAUTH_SECRET
    expect(verifyConnectCallbackSig("acct_123", "web", "qualquer")).toBe(false)
  })
})
