/** @jest-environment node */
/**
 * lib/payments/charge-guards.ts — as duas guardas de qualquer cobrança real.
 *
 * O que isto tranca (checklist de go-live de 01/10/2026, bloqueadores 1 e 2):
 *   1. Não existia interruptor: o checkout só dependia de `getStripe()`, então
 *      gravar `sk_live_` no Vercel abria cobrança a qualquer reserva confirmada.
 *   2. Proprietário sem como receber: o locatário pagava e o repasse não nascia
 *      (`SEM_CONTA_DE_RECEBIMENTO` só fazia console.warn).
 *
 * Padrão registrado: `billingEnabled` ausente = FECHADO em chave live.
 */
import {
  isStripeTestMode, isBillingOpen, hasActiveConnect, ownerHasPayoutPath, checkChargeGuards,
} from "@/lib/payments/charge-guards"
import { clearPlatformConfigCache } from "@/lib/platform-config"

const mockConfigFindMany = jest.fn()
const mockAccountFind    = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    platformConfig:      { findMany:   (...a: unknown[]) => mockConfigFindMany(...a) },
    ownerPaymentAccount: { findUnique: (...a: unknown[]) => mockAccountFind(...a) },
  },
}))

const CHAVE_ORIGINAL = process.env.STRIPE_SECRET_KEY
function chave(v: string | undefined) {
  if (v === undefined) delete process.env.STRIPE_SECRET_KEY
  else process.env.STRIPE_SECRET_KEY = v
}
/** Simula as linhas de PlatformConfig no banco. */
function config(rows: Record<string, string>) {
  mockConfigFindMany.mockResolvedValue(Object.entries(rows).map(([key, value]) => ({ key, value })))
}

beforeEach(() => {
  jest.clearAllMocks()
  clearPlatformConfigCache() // o cache de 60s vazaria o valor de um teste para o outro
  config({})
  mockAccountFind.mockResolvedValue(null)
})
afterAll(() => chave(CHAVE_ORIGINAL))

describe("isStripeTestMode", () => {
  it.each([
    ["sk_test_abc",  true],
    ["rk_test_abc",  true],   // restrita de teste também é modo teste
    ["  sk_test_x\n", true],  // sobra de colagem no painel da Vercel não vira "live"
    ["sk_live_abc",  false],
    ["rk_live_abc",  false],
    ["",             false],
    ["qualquer-coisa", false],
  ])("chave %j → teste=%s", (k, esperado) => {
    chave(k)
    expect(isStripeTestMode()).toBe(esperado)
  })

  it("chave ausente NÃO é teste — na dúvida, fechado", () => {
    chave(undefined)
    expect(isStripeTestMode()).toBe(false)
  })
})

describe("isBillingOpen", () => {
  it("chave de TESTE: aberta sempre, sem nem ler o banco (o staging depende disto)", async () => {
    chave("sk_test_abc")
    config({}) // billingEnabled ausente
    expect(await isBillingOpen()).toBe(true)
    expect(mockConfigFindMany).not.toHaveBeenCalled()
  })

  it("🪤 chave LIVE sem billingEnabled: FECHADA", async () => {
    chave("sk_live_abc")
    config({})
    expect(await isBillingOpen()).toBe(false)
  })

  it("chave LIVE com billingEnabled=false: fechada", async () => {
    chave("sk_live_abc")
    config({ billingEnabled: "false" })
    expect(await isBillingOpen()).toBe(false)
  })

  it("chave LIVE com billingEnabled=true: aberta", async () => {
    chave("sk_live_abc")
    config({ billingEnabled: "true" })
    expect(await isBillingOpen()).toBe(true)
  })

  it.each(["True", "1", " true"])(
    "valor %j NÃO abre — só a string exata \"true\"",
    async (v) => {
      chave("sk_live_abc")
      config({ billingEnabled: v })
      expect(await isBillingOpen()).toBe(false)
    },
  )

  it("🪤 banco fora do ar com chave LIVE: fechada (nunca abre por falha de leitura)", async () => {
    chave("sk_live_abc")
    mockConfigFindMany.mockRejectedValue(new Error("db down"))
    expect(await isBillingOpen()).toBe(false)
  })

  it("chave AUSENTE + billingEnabled=true: abre (a Stripe falhará depois, mas o interruptor é do banco)", async () => {
    chave(undefined)
    config({ billingEnabled: "true" })
    expect(await isBillingOpen()).toBe(true)
  })

  it("a mensagem ao locatário é clara e pt-BR", async () => {
    chave("sk_live_abc")
    const b = await checkChargeGuards("o1")
    expect(b?.message).toMatch(/^Os pagamentos ainda não estão abertos\./)
    expect(b?.message).toContain("Nenhuma cobrança foi feita")
  })
})

describe("hasActiveConnect — a MESMA pergunta do cron de repasse", () => {
  it("conta + status ACTIVE: sim", () => {
    expect(hasActiveConnect({ stripeAccountId: "acct_1", stripeConnectStatus: "ACTIVE" })).toBe(true)
  })

  it.each([
    ["sem stripeAccountId (dado incoerente)", { stripeAccountId: null,     stripeConnectStatus: "ACTIVE" }],
    ["ONBOARDING",                            { stripeAccountId: "acct_1", stripeConnectStatus: "ONBOARDING" }],
    ["sem status",                            { stripeAccountId: "acct_1", stripeConnectStatus: null }],
  ])("%s: não", (_r, conta) => {
    expect(hasActiveConnect(conta)).toBe(false)
  })
})

describe("ownerHasPayoutPath", () => {
  const conta = (over: Record<string, unknown> = {}) => ({
    pixKey: null, status: "PENDING_VERIFICATION", stripeAccountId: null, stripeConnectStatus: "NOT_CONNECTED", ...over,
  })

  it("sem OwnerPaymentAccount: NÃO", async () => {
    mockAccountFind.mockResolvedValue(null)
    expect(await ownerHasPayoutPath("o1")).toBe(false)
    expect(mockAccountFind).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "o1" } }))
  })

  it("Connect ACTIVE: SIM (o cron cria o Transfer sozinho)", async () => {
    mockAccountFind.mockResolvedValue(conta({ stripeAccountId: "acct_1", stripeConnectStatus: "ACTIVE" }))
    expect(await ownerHasPayoutPath("o1")).toBe(true)
  })

  it.each(["ONBOARDING", "RESTRICTED", "REJECTED", "NOT_CONNECTED"])(
    "Connect %s e sem PIX: NÃO",
    async (status) => {
      mockAccountFind.mockResolvedValue(conta({ stripeAccountId: "acct_1", stripeConnectStatus: status }))
      expect(await ownerHasPayoutPath("o1")).toBe(false)
    },
  )

  it("Connect ACTIVE mas sem stripeAccountId (dado incoerente): NÃO conta como Connect", async () => {
    mockAccountFind.mockResolvedValue(conta({ stripeAccountId: null, stripeConnectStatus: "ACTIVE" }))
    expect(await ownerHasPayoutPath("o1")).toBe(false)
  })

  it("chave PIX cadastrada (aguardando verificação): SIM — o admin paga na mão", async () => {
    mockAccountFind.mockResolvedValue(conta({ pixKey: "a@b.com", status: "PENDING_VERIFICATION" }))
    expect(await ownerHasPayoutPath("o1")).toBe(true)
  })

  it("chave PIX verificada: SIM", async () => {
    mockAccountFind.mockResolvedValue(conta({ pixKey: "a@b.com", status: "VERIFIED" }))
    expect(await ownerHasPayoutPath("o1")).toBe(true)
  })

  it("chave PIX REJEITADA pelo admin: NÃO", async () => {
    mockAccountFind.mockResolvedValue(conta({ pixKey: "a@b.com", status: "REJECTED" }))
    expect(await ownerHasPayoutPath("o1")).toBe(false)
  })

  it.each([null, "", "   "])("chave PIX vazia (%j): NÃO", async (pixKey) => {
    mockAccountFind.mockResolvedValue(conta({ pixKey }))
    expect(await ownerHasPayoutPath("o1")).toBe(false)
  })

  it("PIX rejeitado mas Connect ACTIVE: SIM (basta UM caminho)", async () => {
    mockAccountFind.mockResolvedValue(conta({
      pixKey: "a@b.com", status: "REJECTED", stripeAccountId: "acct_1", stripeConnectStatus: "ACTIVE",
    }))
    expect(await ownerHasPayoutPath("o1")).toBe(true)
  })
})

describe("checkChargeGuards — ordem e combinações", () => {
  const PRONTO = { pixKey: "a@b.com", status: "VERIFIED", stripeAccountId: null, stripeConnectStatus: "NOT_CONNECTED" }

  it("tudo em ordem: null", async () => {
    chave("sk_test_abc")
    mockAccountFind.mockResolvedValue(PRONTO)
    expect(await checkChargeGuards("o1")).toBeNull()
  })

  it("cobrança fechada: 403 BILLING_CLOSED, e nem consulta o proprietário", async () => {
    chave("sk_live_abc")
    mockAccountFind.mockResolvedValue(PRONTO)
    expect(await checkChargeGuards("o1")).toMatchObject({ code: "BILLING_CLOSED", status: 403 })
    expect(mockAccountFind).not.toHaveBeenCalled()
  })

  it("aberta + dono sem caminho: 409 OWNER_NOT_READY", async () => {
    chave("sk_live_abc")
    config({ billingEnabled: "true" })
    mockAccountFind.mockResolvedValue(null)
    const b = await checkChargeGuards("o1")
    expect(b).toMatchObject({ code: "OWNER_NOT_READY", status: 409 })
    expect(b?.message).toContain("proprietário ainda não configurou o recebimento")
  })

  it("chave de teste NÃO dispensa a guarda do proprietário", async () => {
    chave("sk_test_abc")
    mockAccountFind.mockResolvedValue(null)
    expect(await checkChargeGuards("o1")).toMatchObject({ code: "OWNER_NOT_READY" })
  })
})
