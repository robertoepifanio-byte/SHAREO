/** @jest-environment node */
/**
 * Testes de integração para PATCH/PUT /api/items/[id] e POST /api/items/[id]/images
 *
 * Arquivos fonte:
 *   - app/api/items/[id]/route.ts       (PUT para atualizar campos)
 *   - app/api/items/[id]/images/route.ts (POST para adicionar / DELETE para remover foto)
 *
 * Regra de negócio:
 *   1. Ao adicionar a PRIMEIRA foto a um item DRAFT → item passa para status="AVAILABLE"
 *   2. Ao remover TODAS as fotos de um item AVAILABLE → item volta para status="DRAFT"
 *   3. Atualizar campos de um item DRAFT sem adicionar foto → status permanece "DRAFT"
 */

import { NextRequest } from "next/server"
import { PUT }    from "@/app/api/items/[id]/route"
import { POST as POST_IMAGE, DELETE as DELETE_IMAGE } from "@/app/api/items/[id]/images/route"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockItemFindFirst  = jest.fn()
const mockItemUpdate     = jest.fn()
const mockItemFindUnique = jest.fn()
const mockImageCreate    = jest.fn()
const mockImageFindFirst = jest.fn()
const mockImageDelete    = jest.fn()
const mockImageCount     = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    item: {
      findFirst:  (...args: unknown[]) => mockItemFindFirst(...args),
      findUnique: (...args: unknown[]) => mockItemFindUnique(...args),
      update:     (...args: unknown[]) => mockItemUpdate(...args),
    },
    itemImage: {
      create:    (...args: unknown[]) => mockImageCreate(...args),
      findFirst: (...args: unknown[]) => mockImageFindFirst(...args),
      delete:    (...args: unknown[]) => mockImageDelete(...args),
      count:     (...args: unknown[]) => mockImageCount(...args),
    },
  },
}))

const mockAuth = jest.fn()
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}))

jest.mock("@/lib/geocodeItem", () => ({
  geocodeItem: jest.fn().mockResolvedValue(undefined),
}))

// file-type é ESM puro — o Jest não transforma node_modules por padrão
jest.mock("file-type", () => ({
  fileTypeFromBuffer: jest.fn().mockResolvedValue({ mime: "image/jpeg" }),
}))

// Mock do Supabase admin (usado pelo upload de imagens)
const mockStorageUpload    = jest.fn()
const mockStorageRemove    = jest.fn()
const mockStorageGetPublicUrl = jest.fn()

jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        upload:       mockStorageUpload,
        remove:       mockStorageRemove,
        getPublicUrl: mockStorageGetPublicUrl,
      }),
    },
  }),
}))

// ---------------------------------------------------------------------------
// IDs de referência
// ---------------------------------------------------------------------------

const OWNER_ID = "owner-id-001"
const ITEM_ID  = "item-id-abc"
const IMAGE_ID = "image-id-xyz"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSession(userId = OWNER_ID, role = "USER") {
  return { user: { id: userId, role } }
}

function makeParams(id = ITEM_ID) {
  return { params: Promise.resolve({ id }) }
}

/** Cria NextRequest para PUT /api/items/[id] */
function makePutReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost:3000/api/items/${ITEM_ID}`, {
    method:  "PUT",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  })
}

/** Cria NextRequest para DELETE /api/items/[id]/images com body JSON */
function makeDeleteImageReq(imageId: string): NextRequest {
  return new NextRequest(`http://localhost:3000/api/items/${ITEM_ID}/images`, {
    method:  "DELETE",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ imageId }),
  })
}

/** Cria item mockado usando status enum */
function makeItem(overrides: { status?: "DRAFT" | "AVAILABLE"; imageCount?: number } = {}) {
  return {
    id:       ITEM_ID,
    ownerId:  OWNER_ID,
    status:   overrides.status ?? "AVAILABLE",
    _count:   { images: overrides.imageCount ?? 0 },
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue(makeSession())
  mockStorageGetPublicUrl.mockReturnValue({
    data: { publicUrl: `https://storage.exemplo.com/${ITEM_ID}/foto.jpg` },
  })
  mockStorageUpload.mockResolvedValue({ error: null })
  mockStorageRemove.mockResolvedValue({ error: null })
})

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("Regra de status DRAFT/AVAILABLE por fotos", () => {

  // --------------------------------------------------------------------------
  // 1. Adicionar primeira foto a item DRAFT → AVAILABLE
  // --------------------------------------------------------------------------
  describe("POST /api/items/[id]/images — primeira foto em item DRAFT", () => {
    it("ao adicionar a 1ª foto a um item DRAFT, item muda para status=AVAILABLE", async () => {
      // Item está DRAFT (sem fotos)
      mockItemFindFirst.mockResolvedValue(makeItem({ status: "DRAFT", imageCount: 0 }))

      mockImageCreate.mockResolvedValue({
        id:    IMAGE_ID,
        url:   `https://storage.exemplo.com/${ITEM_ID}/foto.jpg`,
        order: 0,
      })

      // A implementação deve chamar item.update para promover o item
      mockItemUpdate.mockResolvedValue({ id: ITEM_ID, status: "AVAILABLE" })

      // Cria um File simulado
      const file = new File(["fake-image-data"], "foto.jpg", { type: "image/jpeg" })
      const formData = new FormData()
      formData.append("file", file)

      const req = new NextRequest(`http://localhost:3000/api/items/${ITEM_ID}/images`, {
        method: "POST",
        body:   formData,
      })

      const res = await POST_IMAGE(req, makeParams())

      expect(res.status).toBe(201)

      // A rota deve ter chamado item.update com status: "AVAILABLE" após a 1ª foto
      expect(mockItemUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ITEM_ID },
          data:  expect.objectContaining({ status: "AVAILABLE" }),
        })
      )
    })

    it("ao adicionar foto adicional a item já AVAILABLE (imageCount>=1), status permanece AVAILABLE", async () => {
      // Item já tem 1 foto e está AVAILABLE
      mockItemFindFirst.mockResolvedValue(makeItem({ status: "AVAILABLE", imageCount: 1 }))

      mockImageCreate.mockResolvedValue({
        id: IMAGE_ID, url: "https://storage.exemplo.com/foto2.jpg", order: 1,
      })

      const file = new File(["fake"], "foto2.jpg", { type: "image/jpeg" })
      const formData = new FormData()
      formData.append("file", file)

      const req = new NextRequest(`http://localhost:3000/api/items/${ITEM_ID}/images`, {
        method: "POST",
        body:   formData,
      })

      await POST_IMAGE(req, makeParams())

      // Não deve ter chamado update para mudar status (já estava AVAILABLE)
      // Se chamou, deve manter status: "AVAILABLE"
      const updateCalls = mockItemUpdate.mock.calls
      for (const call of updateCalls) {
        const data = (call[0] as { data?: { status?: string } })?.data
        if (data && "status" in data) {
          expect(data.status).toBe("AVAILABLE")
        }
      }
    })
  })

  // --------------------------------------------------------------------------
  // 2. Remover todas as fotos de item AVAILABLE → DRAFT
  // --------------------------------------------------------------------------
  describe("DELETE /api/items/[id]/images — remover última foto", () => {
    it("ao remover a última foto de item AVAILABLE, item volta para status=DRAFT", async () => {
      // Imagem que será deletada — inclui status e _count que a rota lê via include
      mockImageFindFirst.mockResolvedValue({
        id:    IMAGE_ID,
        url:   `https://storage.exemplo.com/${ITEM_ID}/foto.jpg`,
        itemId: ITEM_ID,
        item:  { ownerId: OWNER_ID, status: "AVAILABLE", _count: { images: 1 } },
      })

      // mockImageCount não é usado pela rota DELETE (usa _count embutido no findFirst)
      mockImageCount.mockResolvedValue(0)

      mockImageDelete.mockResolvedValue({})
      mockItemUpdate.mockResolvedValue({ id: ITEM_ID, status: "DRAFT" })

      const res = await DELETE_IMAGE(makeDeleteImageReq(IMAGE_ID), makeParams())

      expect(res.status).toBe(204)

      // A rota deve ter chamado item.update com status: "DRAFT" ao remover a última foto
      expect(mockItemUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: ITEM_ID },
          data:  expect.objectContaining({ status: "DRAFT" }),
        })
      )
    })

    it("ao remover uma foto (não a última), item permanece status=AVAILABLE", async () => {
      // Item tem 3 fotos — após remover 1, ainda sobram 2
      mockImageFindFirst.mockResolvedValue({
        id:    IMAGE_ID,
        url:   `https://storage.exemplo.com/${ITEM_ID}/foto1.jpg`,
        itemId: ITEM_ID,
        item:  { ownerId: OWNER_ID, status: "AVAILABLE", _count: { images: 3 } },
      })

      // mockImageCount não é usado pela rota DELETE (usa _count embutido no findFirst)
      mockImageCount.mockResolvedValue(2)

      mockImageDelete.mockResolvedValue({})

      await DELETE_IMAGE(makeDeleteImageReq(IMAGE_ID), makeParams())

      // Se update foi chamado, não deve ter rebaixado o item para DRAFT
      const updateCalls = mockItemUpdate.mock.calls
      for (const call of updateCalls) {
        const data = (call[0] as { data?: { status?: string } })?.data
        if (data && "status" in data) {
          expect(data.status).not.toBe("DRAFT")
        }
      }
    })
  })

  // --------------------------------------------------------------------------
  // 3. PUT /api/items/[id] sem alterar fotos — status DRAFT deve permanecer
  // --------------------------------------------------------------------------
  describe("PUT /api/items/[id] — atualizar campos sem tocar nas fotos", () => {
    it("atualizar título de item DRAFT (sem fotos) → status permanece DRAFT", async () => {
      mockItemFindFirst.mockResolvedValue({ id: ITEM_ID, ownerId: OWNER_ID })

      const updatedItem = {
        id:          ITEM_ID,
        title:       "Furadeira Bosch 750W (atualizada)",
        status:      "DRAFT", // continua DRAFT
        updatedAt:   new Date(),
        pricePerDay: 5000,
      }
      mockItemUpdate.mockResolvedValue(updatedItem)

      const res  = await PUT(makePutReq({ title: "Furadeira Bosch 750W (atualizada)" }), makeParams())
      const body = await res.json() as { data: Record<string, unknown> }

      expect(res.status).toBe(200)
      expect(body.data.status).toBe("DRAFT")
    })

    it("atualizar preço de item DRAFT → status não é alterado para AVAILABLE", async () => {
      mockItemFindFirst.mockResolvedValue({ id: ITEM_ID, ownerId: OWNER_ID })

      mockItemUpdate.mockResolvedValue({
        id: ITEM_ID, title: "Furadeira", status: "DRAFT",
        updatedAt: new Date(), pricePerDay: 6000,
      })

      const res = await PUT(makePutReq({ pricePerDay: 6000 }), makeParams())

      expect(res.status).toBe(200)

      // O update chamado pelo PUT não deve ter passado status: "AVAILABLE"
      expect(mockItemUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ status: "AVAILABLE" }),
        })
      )
    })
  })
})
