/** @jest-environment node */
/**
 * DELETE /api/users/me/biometric-consent — revogação apaga TODAS as selfies.
 *
 * Regressão: o código anterior apagava só `idSelfieUrl` (a última selfie gravada).
 * Reenvios após rejeição acumulam arquivos `selfie-<ts>.<ext>` no mesmo prefixo;
 * este teste garante que TODOS são apagados após a revogação.
 */
import { NextRequest } from "next/server"

const mockWithUser     = jest.fn()
const mockUserUpdate   = jest.fn().mockResolvedValue({})
const mockList         = jest.fn()
const mockRemove       = jest.fn()
const mockAfterTasks: Array<() => unknown> = []

jest.mock("@/lib/withUser",      () => ({ withUser: (...a: unknown[]) => mockWithUser(...a) }))
jest.mock("@/lib/prisma",        () => ({ prisma: { user: { update: (...a: unknown[]) => mockUserUpdate(...a) } } }))
jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        list:   (...a: unknown[]) => mockList(...a),
        remove: (...a: unknown[]) => mockRemove(...a),
      }),
    },
  }),
}))
jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: (fn: () => unknown) => { mockAfterTasks.push(fn) },
}))

import { DELETE } from "@/app/api/users/me/biometric-consent/route"

const USER_ID   = "cuser1"
const PREFIXO   = `id-verification/${USER_ID}`
const req       = () => new NextRequest("http://localhost/api/users/me/biometric-consent", { method: "DELETE" })
const executar  = () => Promise.all(mockAfterTasks.splice(0).map((t) => t()))

beforeEach(() => {
  jest.clearAllMocks()
  mockAfterTasks.length = 0
  mockWithUser.mockResolvedValue({
    id:                USER_ID,
    idSelfieUrl:       `${PREFIXO}/selfie-100.jpg`,
    idSelfieConsentAt: new Date(),
  })
  mockRemove.mockResolvedValue({ data: [], error: null })
})

describe("DELETE /api/users/me/biometric-consent — apaga todas as selfies", () => {
  it("🪤 apaga TODAS as selfies do prefixo (reenvio acumula; apagar só a última é defeito)", async () => {
    mockList.mockResolvedValue({
      data: [
        { name: "selfie-100.jpg", id: "id-a" }, // selfie antiga
        { name: "selfie-200.jpg", id: "id-b" }, // selfie nova (idSelfieUrl atual)
        { name: "document-100.jpg", id: "id-c" }, // documento — NÃO deve ser apagado
      ],
      error: null,
    })

    const res = await DELETE(req())
    expect(res.status).toBe(204)
    await executar()

    expect(mockList).toHaveBeenCalledWith(PREFIXO)
    expect(mockRemove).toHaveBeenCalledWith([
      `${PREFIXO}/selfie-100.jpg`,
      `${PREFIXO}/selfie-200.jpg`,
    ])
    // O documento NÃO deve aparecer no remove — só selfies
    const [caminhos] = mockRemove.mock.calls[0] as [string[]]
    expect(caminhos.some((p) => p.includes("document-"))).toBe(false)
  })

  it("🪤 regressão: NÃO faz remove somente de idSelfieUrl — lista o prefixo inteiro", async () => {
    mockList.mockResolvedValue({
      data: [
        { name: "selfie-50.jpg",  id: "id-old" }, // selfie ainda mais antiga — era ignorada
        { name: "selfie-100.jpg", id: "id-a"   }, // a atual (idSelfieUrl)
      ],
      error: null,
    })

    await DELETE(req())
    await executar()

    // Ambas devem estar no remove, não só selfie-100.jpg
    const [caminhos] = mockRemove.mock.calls[0] as [string[]]
    expect(caminhos).toContain(`${PREFIXO}/selfie-50.jpg`)
    expect(caminhos).toContain(`${PREFIXO}/selfie-100.jpg`)
  })

  it("nenhuma selfie no prefixo: não chama remove", async () => {
    mockList.mockResolvedValue({
      data: [{ name: "document-100.jpg", id: "id-c" }],
      error: null,
    })

    await DELETE(req())
    await executar()

    expect(mockRemove).not.toHaveBeenCalled()
  })

  it("204 mesmo se list falha (best-effort)", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
    mockList.mockResolvedValue({ data: null, error: { message: "bucket indisponível" } })

    const res = await DELETE(req())
    expect(res.status).toBe(204)
    await executar()

    expect(mockRemove).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringMatching(/listagem/), "bucket indisponível")
    warnSpy.mockRestore()
  })

  it("sem consentimento biométrico ativo: 404 e Storage não é tocado", async () => {
    mockWithUser.mockResolvedValue({ id: USER_ID, idSelfieUrl: null, idSelfieConsentAt: null })

    const res = await DELETE(req())
    expect(res.status).toBe(404)
    await executar()

    expect(mockList).not.toHaveBeenCalled()
    expect(mockRemove).not.toHaveBeenCalled()
  })
})
