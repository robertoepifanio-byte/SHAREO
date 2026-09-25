/** @jest-environment node */
/**
 * DELETE /api/users/me — fiação da limpeza do Storage (LGPD art. 18).
 *
 * O bug original vivia AQUI, na rota (`list(userId)` contra `id-verification/<userId>/…`).
 * O helper tem os próprios testes (__tests__/unit/lib/purge-user-storage.test.ts); este
 * arquivo prova que a ROTA:
 *   - usa o admin client com o userId da sessão, depois da resposta (`after`);
 *   - apaga fotos de anúncios do titular (alvosExtras por itemId);
 *   - apaga fotos de reserva do titular (BookingPhoto.uploadedBy == userId, via apagarPathsExplicitos);
 *   - invoca invalidateUserSessions antes de responder;
 *   - registra falhas de Storage no Sentry (captureException).
 * Nada aqui toca Supabase real.
 */
import { NextRequest } from "next/server"

const mockUserId               = jest.fn()
const mockCreateAdmin          = jest.fn()
const mockList                 = jest.fn()
const mockRemove               = jest.fn()
const mockFindBooking          = jest.fn()
const mockReviewUpdateMany     = jest.fn()
const mockItemFindMany         = jest.fn()
const mockBookingPhotoFindMany = jest.fn()
const mockUserFindMany         = jest.fn().mockResolvedValue([]) // admins superadmin
const mockNotificationCreateMany = jest.fn().mockResolvedValue({ count: 0 })
const mockInvalidateSessions   = jest.fn().mockResolvedValue(true)
const mockSentryCapture        = jest.fn()
const mockAfterTasks: Array<() => unknown> = []

jest.mock("@/lib/resolveUserId",         () => ({ resolveUserId: (...a: unknown[]) => mockUserId(...a) }))
jest.mock("@/lib/supabase/admin",        () => ({ createAdminClient: () => mockCreateAdmin() }))
jest.mock("@/lib/access-log",            () => ({ logAccess: jest.fn(), extractClientIp: () => "127.0.0.1" }))
jest.mock("@/lib/geocodeUser",           () => ({ geocodeUserLocation: jest.fn() }))
jest.mock("@/lib/redis-admin-blocklist", () => ({
  invalidateUserSessions: (...a: unknown[]) => mockInvalidateSessions(...a),
  isSessionStale:         jest.fn().mockResolvedValue(false),
}))
jest.mock("@sentry/nextjs", () => ({ captureException: (...a: unknown[]) => mockSentryCapture(...a) }))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction:        jest.fn().mockResolvedValue([]),
    booking:             { findFirst: (...a: unknown[]) => mockFindBooking(...a), updateMany: jest.fn() },
    platformTransaction: { count: jest.fn().mockResolvedValue(0) },
    payout:              { count: jest.fn().mockResolvedValue(0) },
    user:                { update: jest.fn(), findMany: (...a: unknown[]) => mockUserFindMany(...a) },
    review:              { updateMany: (...a: unknown[]) => mockReviewUpdateMany(...a) },
    message:             { updateMany: jest.fn() },
    ownerPaymentAccount: { updateMany: jest.fn() },
    item:                { findMany: (...a: unknown[]) => mockItemFindMany(...a) },
    bookingPhoto:        { findMany: (...a: unknown[]) => mockBookingPhotoFindMany(...a) },
    notification:        { createMany: (...a: unknown[]) => mockNotificationCreateMany(...a) },
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

// URL pública de uma foto de reserva no Supabase Storage
const bookingPhotoUrl = (bookingId: string, userId: string) =>
  `https://zythygwvmrwrqmnrdufq.supabase.co/storage/v1/object/public/booking-photos/bookings/${bookingId}/checkin/100-${userId}.jpg`

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
  // Sem itens nem fotos de reserva por padrão
  mockItemFindMany.mockResolvedValue([])
  mockBookingPhotoFindMany.mockResolvedValue([])
  // Por padrão: 0 admins superadmin (não dispara notificações em testes existentes)
  mockUserFindMany.mockResolvedValue([])
  mockNotificationCreateMany.mockResolvedValue({ count: 0 })
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

  it("🪤 falha de Storage aciona Sentry (alerta operadores) além do console.error", async () => {
    storageCom({ "id-docs": { [`id-verification/${USER}`]: ["selfie-1.jpg"] } })
    mockRemove.mockResolvedValue({ data: null, error: { message: "storage down" } })

    await DELETE(req())
    await rodarTarefasPosResposta()

    expect(mockSentryCapture).toHaveBeenCalledTimes(1)
    const [err, ctx] = mockSentryCapture.mock.calls[0] as [Error, { extra: { userId: string } }]
    expect(err.message).toMatch(/LGPD/)
    expect(ctx.extra.userId).toBe(USER)
    expect(errSpy).toHaveBeenCalled() // log também mantido
  })

  it("🪤 Sentry é chamado quando createAdminClient lança (limpeza nem começa)", async () => {
    mockCreateAdmin.mockImplementation(() => { throw new Error("supabaseUrl is required.") })

    await DELETE(req())
    await rodarTarefasPosResposta()

    expect(mockSentryCapture).toHaveBeenCalledTimes(1)
    const [, ctx] = mockSentryCapture.mock.calls[0] as [Error, { extra: { userId: string } }]
    expect(ctx.extra.userId).toBe(USER)
  })
})

describe("DELETE /api/users/me — fotos de anúncio e de reserva (decisão fundador 25/09/2026)", () => {
  it("🪤 apaga pastas de itens do titular via alvosExtras", async () => {
    mockItemFindMany.mockResolvedValue([{ id: "item-abc" }, { id: "item-xyz" }])
    mockBookingPhotoFindMany.mockResolvedValue([])
    storageCom({
      "item-images": {
        "item-abc": ["foto1.jpg", "foto2.jpg"],
        "item-xyz": ["capa.jpg"],
        [`uploads/${USER}`]: [],
      },
    })

    await DELETE(req())
    await rodarTarefasPosResposta()

    expect(mockList).toHaveBeenCalledWith("item-images", "item-abc")
    expect(mockList).toHaveBeenCalledWith("item-images", "item-xyz")
    expect(mockRemove).toHaveBeenCalledWith("item-images", ["item-abc/foto1.jpg", "item-abc/foto2.jpg"])
    expect(mockRemove).toHaveBeenCalledWith("item-images", ["item-xyz/capa.jpg"])
    expect(errSpy).not.toHaveBeenCalled()
  })

  it("🪤 apaga somente as fotos de reserva do titular (uploadedBy == userId), não da outra parte", async () => {
    const urlTitular = bookingPhotoUrl("b1", USER)
    const urlOutro   = bookingPhotoUrl("b2", "outro-user")
    mockItemFindMany.mockResolvedValue([])
    mockBookingPhotoFindMany.mockResolvedValue([{ url: urlTitular }])
    storageCom({ "booking-photos": { [`uploads/${USER}`]: [] } })

    await DELETE(req())
    await rodarTarefasPosResposta()

    // A foto da outra parte (urlOutro) NÃO foi passada para a rota — mockBookingPhotoFindMany
    // retorna só a do titular; confirmamos que o remove foi chamado com o caminho correto.
    expect(mockBookingPhotoFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { uploadedBy: USER } }),
    )
    expect(mockRemove).toHaveBeenCalledWith(
      "booking-photos",
      [`bookings/b1/checkin/100-${USER}.jpg`],
    )
    // Foto do outro usuário nunca foi submetida ao remove
    expect(mockRemove).not.toHaveBeenCalledWith("booking-photos", expect.arrayContaining([`bookings/b2/checkin/100-outro-user.jpg`]))
  })

  it("item sem fotos no Storage: nenhum remove é chamado para aquele item", async () => {
    mockItemFindMany.mockResolvedValue([{ id: "item-vazio" }])
    mockBookingPhotoFindMany.mockResolvedValue([])
    storageCom({ "item-images": { "item-vazio": [] } })

    await DELETE(req())
    await rodarTarefasPosResposta()

    expect(mockRemove).not.toHaveBeenCalledWith("item-images", expect.anything())
    expect(errSpy).not.toHaveBeenCalled()
  })
})

describe("DELETE /api/users/me — invalidação de sessão", () => {
  it("🪤 chama invalidateUserSessions com o userId antes de responder", async () => {
    storageCom({})

    const res = await DELETE(req())

    expect(res.status).toBe(200)
    // A invalidação deve ter sido chamada ANTES da resposta (não dentro do after())
    expect(mockInvalidateSessions).toHaveBeenCalledWith(USER)
    expect(mockInvalidateSessions).toHaveBeenCalledTimes(1)
  })

  it("🪤 falha do Upstash não aborta a exclusão (conta segue sendo anonimizada)", async () => {
    mockInvalidateSessions.mockRejectedValueOnce(new Error("redis down"))
    storageCom({})

    const res = await DELETE(req())

    expect(res.status).toBe(200)
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringMatching(/invalidateUserSessions/),
      expect.stringMatching(/redis down/),
    )
  })
})

describe("DELETE /api/users/me — notificação in-app de admins em falha do Storage", () => {
  it("🪤 falha do Storage cria notificação para todos os ADMIN_SUPERADMIN (userId sem PII)", async () => {
    storageCom({ "id-docs": { [`id-verification/${USER}`]: ["selfie-1.jpg"] } })
    mockRemove.mockResolvedValue({ data: null, error: { message: "storage down" } })
    mockUserFindMany.mockResolvedValue([{ id: "admin1" }, { id: "admin2" }])

    await DELETE(req())
    await rodarTarefasPosResposta()

    // findMany deve filtrar ADMIN_SUPERADMIN
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { role: "ADMIN", adminRole: "ADMIN_SUPERADMIN" } }),
    )
    // createMany deve incluir ambos os admins
    expect(mockNotificationCreateMany).toHaveBeenCalledTimes(1)
    const [{ data }] = mockNotificationCreateMany.mock.calls[0] as [{ data: { userId: string; title: string; data: { userId: string } }[] }][]
    expect(data.map((n) => n.userId)).toEqual(expect.arrayContaining(["admin1", "admin2"]))
    // Notificação NÃO contém PII — só userId do titular e contagem
    expect(data[0].title).toMatch(/LGPD/)
    expect((data[0].data as { userId: string }).userId).toBe(USER)
    expect(data[0]).not.toHaveProperty("email")
    expect(data[0]).not.toHaveProperty("name")
  })

  it("sem ADMIN_SUPERADMIN no banco: createMany não é chamado", async () => {
    storageCom({ "id-docs": { [`id-verification/${USER}`]: ["selfie-1.jpg"] } })
    mockRemove.mockResolvedValue({ data: null, error: { message: "storage down" } })
    mockUserFindMany.mockResolvedValue([]) // nenhum superadmin

    await DELETE(req())
    await rodarTarefasPosResposta()

    expect(mockNotificationCreateMany).not.toHaveBeenCalled()
  })

  it("🪤 limpeza que nem começa (catch externo) também notifica os superadmins", async () => {
    mockCreateAdmin.mockImplementation(() => { throw new Error("supabaseUrl is required.") })
    mockUserFindMany.mockResolvedValue([{ id: "admin1" }])

    await DELETE(req())
    await rodarTarefasPosResposta()

    expect(mockNotificationCreateMany).toHaveBeenCalledTimes(1)
  })
})
