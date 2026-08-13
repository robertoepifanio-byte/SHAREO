/** @jest-environment node */
/**
 * SSRF nos webhooks de saída (PJ) — bypass por redirect.
 *
 * Arquivo fonte: lib/outboundWebhooks.ts
 *
 * Contexto: o usuário PJ registra a URL do próprio webhook. `isUrlSafeForWebhook()`
 * valida essa URL — resolve o DNS e recusa IP privado/loopback/metadata — e é
 * chamado tanto na criação (`app/api/pj/webhooks/route.ts`) quanto na entrega,
 * o que já cobre rebinding de DNS.
 *
 * O buraco era o `fetch`: sem opção `redirect`, o padrão é `follow`. Bastava
 * apontar o webhook para um host público sob controle do atacante e responder
 * `302 → http://169.254.169.254/…` — o servidor buscava o endereço interno e o
 * guard nunca via essa segunda URL. Como `lastStatusCode` é gravado e exibido ao
 * dono do webhook, o status vira oráculo para mapear serviço interno.
 *
 * Endpoint de webhook deve ser final; seguir redirect não tem uso legítimo aqui.
 */
import { dispatchWebhookEvent } from "@/lib/outboundWebhooks"

const mockFindMany = jest.fn()
const mockUpdate   = jest.fn()
const mockUrlSafe  = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    outboundWebhook: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      update:   (...a: unknown[]) => mockUpdate(...a),
    },
  },
}))

jest.mock("@/lib/ssrfGuard", () => ({
  isUrlSafeForWebhook: (...a: unknown[]) => mockUrlSafe(...a),
}))

const fetchMock = jest.fn()
global.fetch = fetchMock as unknown as typeof fetch

beforeEach(() => {
  jest.clearAllMocks()
  mockUpdate.mockResolvedValue({})
  mockUrlSafe.mockResolvedValue(true)
  mockFindMany.mockResolvedValue([
    { id: "wh-1", url: "https://cliente-pj.example.com/hook", secret: "s3cr3t" },
  ])
  jest.spyOn(console, "error").mockImplementation(() => {})
})

describe("dispatchWebhookEvent — SSRF por redirect", () => {
  it('envia com redirect: "manual" — o defeito que este PR corrige', async () => {
    fetchMock.mockResolvedValue({ status: 200, ok: true })
    await dispatchWebhookEvent("owner-1", "booking.created", { id: "b1" })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0]
    expect(init).toMatchObject({ redirect: "manual" })
  })

  it("trata 302 como FALHA, sem seguir para o destino", async () => {
    // Com redirect:"manual" o fetch devolve o próprio 3xx; nada é seguido.
    fetchMock.mockResolvedValue({ status: 302, ok: false })
    await dispatchWebhookEvent("owner-1", "booking.created", { id: "b1" })

    expect(fetchMock).toHaveBeenCalledTimes(1) // não houve 2ª requisição
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lastStatusCode: 302,
          failureCount:   { increment: 1 },
        }),
      }),
    )
  })

  it("não dispara quando o guard de SSRF recusa a URL", async () => {
    mockUrlSafe.mockResolvedValue(false)
    await dispatchWebhookEvent("owner-1", "booking.created", { id: "b1" })

    expect(fetchMock).not.toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastStatusCode: null }),
      }),
    )
  })

  it("assina o corpo com HMAC do secret do webhook", async () => {
    fetchMock.mockResolvedValue({ status: 200, ok: true })
    await dispatchWebhookEvent("owner-1", "booking.paid", { id: "b1" })

    const [, init] = fetchMock.mock.calls[0]
    const headers = (init as { headers: Record<string, string> }).headers
    expect(headers["X-ShareO-Signature"]).toMatch(/^sha256=[0-9a-f]{64}$/)
    expect(headers["X-ShareO-Event"]).toBe("booking.paid")
  })

  it("aplica timeout na entrega (não deixa a lambda pendurada)", async () => {
    fetchMock.mockResolvedValue({ status: 200, ok: true })
    await dispatchWebhookEvent("owner-1", "booking.created", { id: "b1" })

    const [, init] = fetchMock.mock.calls[0]
    expect((init as { signal?: AbortSignal }).signal).toBeInstanceOf(AbortSignal)
  })
})
