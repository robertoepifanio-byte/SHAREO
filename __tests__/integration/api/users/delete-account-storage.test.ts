/** @jest-environment node */
/**
 * DELETE /api/users/me — fiação da limpeza do Storage (LGPD art. 18).
 *
 * O bug original vivia AQUI, na rota (`list(userId)` contra `id-verification/<userId>/…`).
 * O helper tem os próprios testes (__tests__/unit/lib/purge-user-storage.test.ts); este
 * arquivo prova que a ROTA o usa com o admin client e o userId da sessão, depois da
 * resposta (`after`), e que falha de Storage vira log de erro. Nada aqui toca Supabase real.
 */
import { NextRequest } from "next/server"

const mockUserId      = jest.fn()
const mockCreateAdmin = jest.fn()
const mockList        = jest.fn()
const mockRemove      = jest.fn()
const mockFindBooking = jest.fn()
const mockReviewUpdateMany = jest.fn()
const mockAfterTasks: Array<() => unknown> = []

jest.mock("@/lib/resolveUserId", () => ({ resolveUserId: (...a: unknown[]) => mockUserId(...a) }))
jest.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => mockCreateAdmin() }))
jest.mock("@/lib/access-log",     () => ({ logAccess: jest.fn(), extractClientIp: () => "127.0.0.1" }))
jest.mock("@/lib/geocodeUser",    () => ({ geocodeUserLocation: jest.fn() }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction:        jest.fn().mockResolvedValue([]),
    booking:             { findFirst: (...a: unknown[]) => mockFindBooking(...a), updateMany: jest.fn() },
    platformTransaction: { count: jest.fn().mockResolvedValue(0) },
    payout:              { count: jest.fn().mockResolvedValue(0) },
    user:                { update: jest.fn() },
    review:              { updateMany: (...a: unknown[]) => mockReviewUpdateMany(...a) },
    message:             { updateMany: jest.fn() },
    ownerPaymentAccount: { updateMany: jest.fn() },
  },
}))
// after() precisa de request scope; aqui capturamos a tarefa para rodá-la e AGUARDÁ-LA.
jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: (fn: () => unknown) => { mockAfterTasks.push(fn) },
}))

import { DELETE } from "@/app/api/users/me/route"

const USER = "cuser1"
const req  = () => new NextRequest("http://localhost/api/users/me", { method: "DELETE" })

/** Bucket → arquivos existentes sob o prefixo pedido. */
function storageCom(arquivos: Record<string, Record<string, string[]>>) {
  mockList.mockImplementation(async (bucket: string, path: string) => ({
    data:  (arquivos[bucket]?.[path] ?? []).map((name) => ({ name, id: `id-${name}` })),
    error: null,
  }))
  mockRemove.mockImplementation(async (_bucket: string, paths: string[]) => ({
    data:  paths.map((name) => ({ name })),
    error: null,
  }))
  mockCreateAdmin.mockReturnValue({
    storage: {
      from: (bucket: string) => ({
        list:   (path: string) => mockList(bucket, path),
        remove: (paths: string[]) => mockRemove(bucket, paths),
      }),
    },
  })
}

const rodarTarefasPosResposta = () => Promise.all(mockAfterTasks.splice(0).map((t) => t()))

let errSpy: jest.SpyInstance
let infoSpy: jest.SpyInstance

beforeEach(() => {
  jest.clearAllMocks()
  mockAfterTasks.length = 0
  mockUserId.mockResolvedValue(USER)
  mockFindBooking.mockResolvedValue(null)
  errSpy  = jest.spyOn(console, "error").mockImplementation(() => {})
  infoSpy = jest.spyOn(console, "info").mockImplementation(() => {})
})
afterEach(() => { errSpy.mockRestore(); infoSpy.mockRestore() })

describe("DELETE /api/users/me — Storage", () => {
  it("🪤 limpa os TRÊS buckets pelo prefixo em que o upload grava (id-verification/<userId>, não <userId>)", async () => {
    storageCom({
      "id-docs":        { [`id-verification/${USER}`]: ["document-1.jpg", "selfie-1.jpg"] },
      "item-images":    { [`uploads/${USER}`]: ["avatar.jpg"] },
      "booking-photos": { [`uploads/${USER}`]: ["avaliacao.jpg"] },
    })

    const res = await DELETE(req())
    expect(res.status).toBe(200)
    await rodarTarefasPosResposta()

    expect(mockList).not.toHaveBeenCalledWith("id-docs", USER)
    expect(mockRemove).toHaveBeenCalledWith("id-docs", [
      `id-verification/${USER}/document-1.jpg`,
      `id-verification/${USER}/selfie-1.jpg`,
    ])
    expect(mockRemove).toHaveBeenCalledWith("item-images",    [`uploads/${USER}/avatar.jpg`])
    expect(mockRemove).toHaveBeenCalledWith("booking-photos", [`uploads/${USER}/avaliacao.jpg`])
    expect(errSpy).not.toHaveBeenCalled()
    expect(infoSpy).toHaveBeenCalledTimes(1)
  })

  it("🪤 a foto da avaliação sai do banco junto com o arquivo (senão a avaliação pública mostra imagem quebrada)", async () => {
    storageCom({})

    await DELETE(req())

    expect(mockReviewUpdateMany).toHaveBeenCalledWith({
      where: { reviewerId: USER },
      data:  { comment: null, photoUrl: null },
    })
  })

  it("🪤 falha do Storage: a exclusão segue 200, mas o que sobrou vai para console.error", async () => {
    storageCom({ "id-docs": { [`id-verification/${USER}`]: ["document-1.jpg", "selfie-1.jpg"] } })
    mockRemove.mockImplementation(async (bucket: string, paths: string[]) =>
      bucket === "id-docs"
        ? { data: null, error: { message: "storage indisponível" } }
        : { data: paths.map((name) => ({ name })), error: null })

    const res = await DELETE(req())
    expect(res.status).toBe(200) // a conta já foi anonimizada; Storage não a desfaz
    await rodarTarefasPosResposta()

    expect(errSpy).toHaveBeenCalledTimes(1)
    const [titulo, json] = errSpy.mock.calls[0] as [string, string]
    expect(titulo).toMatch(/NÃO removidos/)
    const relatorio = JSON.parse(json) as { userId: string; falhas: { bucket: string; sobraram: string[] }[] }
    expect(relatorio.userId).toBe(USER)
    expect(relatorio.falhas[0]).toMatchObject({
      bucket:   "id-docs",
      sobraram: [`id-verification/${USER}/document-1.jpg`, `id-verification/${USER}/selfie-1.jpg`],
    })
    expect(infoSpy).not.toHaveBeenCalled()
  })

  it("cliente admin que nem constrói (env ausente): registra o erro e não derruba a tarefa", async () => {
    mockCreateAdmin.mockImplementation(() => { throw new Error("supabaseUrl is required.") })

    const res = await DELETE(req())
    expect(res.status).toBe(200)
    await expect(rodarTarefasPosResposta()).resolves.toBeDefined()

    expect(errSpy).toHaveBeenCalledTimes(1)
    expect(String(errSpy.mock.calls[0][0])).toMatch(/nem começou/)
  })

  it("locação ACTIVE: 409 e o Storage NÃO é tocado", async () => {
    storageCom({ "id-docs": { [`id-verification/${USER}`]: ["selfie-1.jpg"] } })
    mockFindBooking.mockResolvedValue({ id: "b1" })

    const res = await DELETE(req())
    expect(res.status).toBe(409)
    await rodarTarefasPosResposta()

    expect(mockList).not.toHaveBeenCalled()
    expect(mockRemove).not.toHaveBeenCalled()
  })
})
