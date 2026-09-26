/** @jest-environment node */
/**
 * Testes de notifyConnectStatusIfNeeded — lib/stripe-connect-notify.ts
 *
 * Cobre:
 *   - sem notificação quando status não exige ação (ACTIVE, ONBOARDING, etc.)
 *   - sem notificação quando prevStatus é null (conta recém-criada)
 *   - sem notificação quando status não mudou (idempotência por transição)
 *   - notificação in-app criada ao transitar para RESTRICTED
 *   - notificação in-app criada ao transitar para REJECTED
 *   - e-mail enviado junto da notificação (em paralelo com notification.create)
 *   - falha de e-mail não reverte a notificação in-app
 *   - sem notificação quando OwnerPaymentAccount / User não existe no banco
 *   - PII: e-mail do usuário não aparece em logs
 */
import { StripeConnectStatus } from "@prisma/client"
import { notifyConnectStatusIfNeeded } from "@/lib/stripe-connect-notify"

// ────────────────────────────────────────────────────────────────────────────
// Mocks
// ────────────────────────────────────────────────────────────────────────────

const mockFindUniqueOwner = jest.fn()
const mockCreateNotif     = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    ownerPaymentAccount: { findUnique: (...a: unknown[]) => mockFindUniqueOwner(...a) },
    notification:        { create:     (...a: unknown[]) => mockCreateNotif(...a)     },
  },
}))

const mockSendEmail = jest.fn()
jest.mock("@/lib/email", () => ({
  sendStripeConnectNeedsActionEmail: (...a: unknown[]) => mockSendEmail(...a),
}))

// Dados de teste
const ACCOUNT_ID = "acct_test_123"
const USER_ID    = "user_test_456"

/** Simula o retorno da query única com user relation incluído. */
function ownerWithUser() {
  return {
    user: { id: USER_ID, name: "José Silva", email: "jose@example.com" },
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockFindUniqueOwner.mockResolvedValue(ownerWithUser())
  mockCreateNotif.mockResolvedValue({ id: "notif_1" })
  mockSendEmail.mockResolvedValue(undefined)
  jest.spyOn(console, "warn").mockImplementation(() => {})
  jest.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => jest.restoreAllMocks())

// ────────────────────────────────────────────────────────────────────────────
// Casos em que NÃO deve notificar
// ────────────────────────────────────────────────────────────────────────────

describe("não notifica quando status não exige ação", () => {
  for (const status of [
    StripeConnectStatus.ACTIVE,
    StripeConnectStatus.ONBOARDING,
    StripeConnectStatus.NOT_CONNECTED,
  ] as const) {
    it(`não cria notificação para status ${status}`, async () => {
      await notifyConnectStatusIfNeeded(ACCOUNT_ID, status, StripeConnectStatus.ACTIVE)
      expect(mockFindUniqueOwner).not.toHaveBeenCalled()
      expect(mockCreateNotif).not.toHaveBeenCalled()
      expect(mockSendEmail).not.toHaveBeenCalled()
    })
  }
})

it("não notifica quando prevStatus é null (conta recém-criada, não é degradação)", async () => {
  await notifyConnectStatusIfNeeded(ACCOUNT_ID, StripeConnectStatus.RESTRICTED, null)
  expect(mockCreateNotif).not.toHaveBeenCalled()
  expect(mockSendEmail).not.toHaveBeenCalled()
})

it("não notifica quando status não mudou — idempotência por transição", async () => {
  await notifyConnectStatusIfNeeded(ACCOUNT_ID, StripeConnectStatus.RESTRICTED, StripeConnectStatus.RESTRICTED)
  expect(mockCreateNotif).not.toHaveBeenCalled()
  expect(mockSendEmail).not.toHaveBeenCalled()
})

it("não notifica quando OwnerPaymentAccount não existe no banco", async () => {
  mockFindUniqueOwner.mockResolvedValue(null)
  await notifyConnectStatusIfNeeded(ACCOUNT_ID, StripeConnectStatus.RESTRICTED, StripeConnectStatus.ACTIVE)
  expect(mockCreateNotif).not.toHaveBeenCalled()
  expect(mockSendEmail).not.toHaveBeenCalled()
})

it("não notifica quando user da conta não existe (user: null)", async () => {
  mockFindUniqueOwner.mockResolvedValue({ user: null })
  await notifyConnectStatusIfNeeded(ACCOUNT_ID, StripeConnectStatus.RESTRICTED, StripeConnectStatus.ACTIVE)
  expect(mockCreateNotif).not.toHaveBeenCalled()
})

// ────────────────────────────────────────────────────────────────────────────
// Casos em que DEVE notificar
// ────────────────────────────────────────────────────────────────────────────

it("cria notificação in-app ao transitar ACTIVE → RESTRICTED", async () => {
  await notifyConnectStatusIfNeeded(ACCOUNT_ID, StripeConnectStatus.RESTRICTED, StripeConnectStatus.ACTIVE)
  expect(mockCreateNotif).toHaveBeenCalledTimes(1)
  const callArgs = mockCreateNotif.mock.calls[0][0]
  expect(callArgs.data.type).toBe("STRIPE_CONNECT_NEEDS_ACTION")
  expect(callArgs.data.userId).toBe(USER_ID)
  expect(callArgs.data.data).toMatchObject({ link: "/perfil/recebimentos" })
})

it("cria notificação in-app ao transitar ACTIVE → REJECTED", async () => {
  await notifyConnectStatusIfNeeded(ACCOUNT_ID, StripeConnectStatus.REJECTED, StripeConnectStatus.ACTIVE)
  expect(mockCreateNotif).toHaveBeenCalledTimes(1)
  const callArgs = mockCreateNotif.mock.calls[0][0]
  expect(callArgs.data.type).toBe("STRIPE_CONNECT_NEEDS_ACTION")
})

it("envia e-mail com reason=restricted ao transitar para RESTRICTED", async () => {
  await notifyConnectStatusIfNeeded(ACCOUNT_ID, StripeConnectStatus.RESTRICTED, StripeConnectStatus.ACTIVE)
  expect(mockSendEmail).toHaveBeenCalledWith("jose@example.com", "José Silva", "restricted")
})

it("envia e-mail com reason=rejected ao transitar para REJECTED", async () => {
  await notifyConnectStatusIfNeeded(ACCOUNT_ID, StripeConnectStatus.REJECTED, StripeConnectStatus.ACTIVE)
  expect(mockSendEmail).toHaveBeenCalledWith("jose@example.com", "José Silva", "rejected")
})

it("notifica mesmo partindo de ONBOARDING → RESTRICTED", async () => {
  await notifyConnectStatusIfNeeded(ACCOUNT_ID, StripeConnectStatus.RESTRICTED, StripeConnectStatus.ONBOARDING)
  expect(mockCreateNotif).toHaveBeenCalledTimes(1)
})

// ────────────────────────────────────────────────────────────────────────────
// Resiliência
// ────────────────────────────────────────────────────────────────────────────

it("falha de e-mail não reverte a notificação in-app", async () => {
  mockSendEmail.mockRejectedValue(new Error("Resend down"))
  // Não deve lançar
  await expect(notifyConnectStatusIfNeeded(ACCOUNT_ID, StripeConnectStatus.RESTRICTED, StripeConnectStatus.ACTIVE)).resolves.toBeUndefined()
  // Notificação in-app foi criada mesmo assim
  expect(mockCreateNotif).toHaveBeenCalledTimes(1)
})

// ────────────────────────────────────────────────────────────────────────────
// Segurança / PII
// ────────────────────────────────────────────────────────────────────────────

it("não loga o e-mail do usuário nas mensagens de warn/error", async () => {
  await notifyConnectStatusIfNeeded(ACCOUNT_ID, StripeConnectStatus.RESTRICTED, StripeConnectStatus.ACTIVE)
  const allLogs = [
    ...(console.warn as jest.Mock).mock.calls,
    ...(console.error as jest.Mock).mock.calls,
  ].flat().join(" ")
  expect(allLogs).not.toContain("jose@example.com")
})
