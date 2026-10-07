/** @jest-environment node */
/**
 * POST /api/items/[id]/images — diagnóstico do 500.
 *
 * Em produção (06/10) as 3 fotos do Thiago voltaram "Erro interno." sem pista de
 * qual etapa lançou. Aqui se tranca: o `catch` loga a ETAPA e o contexto do arquivo
 * (sem PII) e a resposta devolve `stage`, sem trocar a mensagem genérica ao usuário.
 */
import { NextRequest } from "next/server"
import { POST } from "@/app/api/items/[id]/images/route"

const mockItemFindFirst  = jest.fn()
const mockImageCreate    = jest.fn()
const mockItemUpdate     = jest.fn()
const mockUpload         = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    item:      { findFirst: (...a: unknown[]) => mockItemFindFirst(...a), update: (...a: unknown[]) => mockItemUpdate(...a) },
    itemImage: { create: (...a: unknown[]) => mockImageCreate(...a) },
  },
}))
jest.mock("@/lib/withUser", () => ({ withUser: jest.fn().mockResolvedValue({ id: "owner-1" }) }))
jest.mock("@/lib/auth", () => ({ auth: jest.fn().mockResolvedValue(null) }))
jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 1, resetAt: 0 }),
  rateLimitResponse: jest.fn(),
  RATE_LIMITS: { upload: { limit: 30, windowMs: 60_000 } },
}))
jest.mock("@/lib/platform-config", () => ({
  getUploadLimits: jest.fn().mockResolvedValue({ maxImagesPerItem: 3, maxUploadSizeMB: 10 }),
}))
jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: { from: () => ({ upload: mockUpload, getPublicUrl: () => ({ data: { publicUrl: "https://x/y.jpg" } }) }) },
  }),
}))
jest.mock("file-type", () => ({ fileTypeFromBuffer: jest.fn().mockResolvedValue({ mime: "image/jpeg" }) }))

const ctx = { params: Promise.resolve({ id: "item-1" }) }

function req() {
  const fd = new FormData()
  fd.append("file", new File([new Uint8Array(10)], "f.jpg", { type: "image/jpeg" }))
  return new NextRequest("http://localhost/api/items/item-1/images", { method: "POST", body: fd })
}

let errorSpy: jest.SpyInstance
beforeEach(() => {
  jest.clearAllMocks()
  errorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
  mockItemFindFirst.mockResolvedValue({ ownerId: "owner-1", status: "DRAFT", _count: { images: 0 } })
  mockUpload.mockResolvedValue({ error: null })
})
afterEach(() => errorSpy.mockRestore())

it("exceção no banco depois do upload: 500 genérico + etapa e contexto no log", async () => {
  mockImageCreate.mockRejectedValue(new Error("Can't reach database server"))

  const res  = await POST(req(), ctx)
  const body = await res.json()

  expect(res.status).toBe(500)
  expect(body.error.message).toBe("Erro interno.")
  expect(body.error.stage).toBe("db-image-create")
  expect(errorSpy).toHaveBeenCalledWith(
    "[POST /api/items/[id]/images] falhou",
    expect.objectContaining({
      stage:  "db-image-create",
      itemId: "item-1",
      file:   { type: "image/jpeg", size: 10 },
      error:  "Can't reach database server",
    }),
  )
})

it("exceção ao falar com o Storage: a etapa é storage-upload, não a do banco", async () => {
  mockUpload.mockRejectedValue(new TypeError("fetch failed"))

  const body = await (await POST(req(), ctx)).json()

  expect(body.error.stage).toBe("storage-upload")
  expect(mockImageCreate).not.toHaveBeenCalled()
})

it("erro tratado (Storage devolve error) continua com a mensagem própria, sem stage", async () => {
  mockUpload.mockResolvedValue({ error: { message: "Bucket not found" } })

  const res  = await POST(req(), ctx)
  const body = await res.json()

  expect(res.status).toBe(500)
  expect(body.error.code).toBe("UPLOAD_FAILED")
  expect(body.error.stage).toBeUndefined()
})
