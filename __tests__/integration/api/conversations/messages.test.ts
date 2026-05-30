/**
 * P2-35 — Testes de integração para mensagens de conversa
 *
 * Arquivos fonte:
 *  - POST mensagem:    app/api/conversations/[id]/messages/route.ts
 *  - GET conversa:     app/api/conversations/[id]/route.ts
 *    (o GET de mensagens está embutido no GET da conversa; a rota de messages
 *     exporta apenas POST — cenários de GET usam a rota [id]/route.ts)
 *
 * Cenários:
 *  1.  GET mensagens da conversa → 200, apenas participantes têm acesso
 *  2.  Não-participante tenta GET → 403
 *  3.  POST mensagem válida → 201, senderId = usuário logado
 *  4.  Mensagem com content vazio → 400
 *  5.  XSS: <script>alert(1)</script> → tags HTML removidas (salvo como texto puro)
 *  6.  Mensagem muito longa (>2000 chars) → 400
 *  7.  POST em conversa que o usuário não participa → 403
 *  8.  Paginação GET: ?page=2&limit=20 → resposta com meta.page e meta.limit
 *  9.  senderId nunca é sobrescrito pelo client (sempre vem da sessão server-side)
 */

import { NextRequest } from "next/server"
import { POST } from "@/app/api/conversations/[id]/messages/route"
import { GET } from "@/app/api/conversations/[id]/route"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockConversationFindUnique = jest.fn()
const mockConversationUpdate     = jest.fn()
const mockMessageCreate          = jest.fn()
const mockMessageFindMany        = jest.fn()
const mockMessageCount           = jest.fn()
const mockMessageUpdateMany      = jest.fn()
const mockParticipantUpdate      = jest.fn()
const mockNotificationCreateMany = jest.fn()

jest.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findUnique: (...args: unknown[]) => mockConversationFindUnique(...args),
      update:     (...args: unknown[]) => mockConversationUpdate(...args),
    },
    conversationParticipant: {
      update: (...args: unknown[]) => mockParticipantUpdate(...args),
    },
    message: {
      create:     (...args: unknown[]) => mockMessageCreate(...args),
      findMany:   (...args: unknown[]) => mockMessageFindMany(...args),
      count:      (...args: unknown[]) => mockMessageCount(...args),
      updateMany: (...args: unknown[]) => mockMessageUpdateMany(...args),
    },
    notification: {
      createMany: (...args: unknown[]) => mockNotificationCreateMany(...args),
    },
  },
}))

// resolveUserId lê Bearer JWT ou sessão NextAuth — mockamos para retornar userId direto
const mockResolveUserId = jest.fn()
jest.mock("@/lib/resolveUserId", () => ({
  resolveUserId: (...args: unknown[]) => mockResolveUserId(...args),
}))

// auth é usado pela rota GET de conversa internamente via resolveUserId
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

// ---------------------------------------------------------------------------
// IDs de referência
// ---------------------------------------------------------------------------

const USER_A_ID  = "user-alpha-001"
const USER_B_ID  = "user-beta-002"
const THIRD_ID   = "user-gamma-003"
const CONV_ID    = "conv-test-abc"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeParams(id = CONV_ID) {
  return { params: Promise.resolve({ id }) }
}

function makeConversation(participantIds: string[] = [USER_A_ID, USER_B_ID]) {
  return {
    id:          CONV_ID,
    createdAt:   new Date("2026-05-01"),
    booking:     null,
    participants: participantIds.map((userId) => ({
      userId,
      lastReadAt: null,
      user: { id: userId, name: `User ${userId.slice(0, 5)}`, avatarUrl: null },
    })),
  }
}

function makePostRequest(body: Record<string, unknown>, convId = CONV_ID): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/conversations/${convId}/messages`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    },
  )
}

function makeGetRequest(query = "", convId = CONV_ID): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/conversations/${convId}${query}`,
    { method: "GET" },
  )
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
  mockConversationUpdate.mockResolvedValue({})
  mockMessageUpdateMany.mockResolvedValue({ count: 0 })
  mockParticipantUpdate.mockResolvedValue({})
  mockNotificationCreateMany.mockResolvedValue({})
})

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("GET /api/conversations/[id] (mensagens embutidas)", () => {

  describe("cenário 1 — participante acessa conversa → 200", () => {
    it("participante legítimo recebe 200 e messages no payload", async () => {
      mockResolveUserId.mockResolvedValue(USER_A_ID)
      mockConversationFindUnique.mockResolvedValue(makeConversation())
      mockMessageFindMany.mockResolvedValue([
        {
          id:        "msg-001",
          senderId:  USER_A_ID,
          content:   "Olá, o item está disponível?",
          readAt:    null,
          createdAt: new Date(),
          sender:    { id: USER_A_ID, name: "User alpha" },
        },
      ])
      mockMessageCount.mockResolvedValue(1)

      const res  = await GET(makeGetRequest(), makeParams())
      const body = await res.json() as { data: { messages: unknown[] } }

      expect(res.status).toBe(200)
      expect(Array.isArray(body.data.messages)).toBe(true)
      expect(body.data.messages).toHaveLength(1)
    })
  })

  describe("cenário 2 — não-participante tenta GET → 403", () => {
    it("usuário fora da conversa recebe 403 FORBIDDEN", async () => {
      mockResolveUserId.mockResolvedValue(THIRD_ID)
      mockConversationFindUnique.mockResolvedValue(makeConversation([USER_A_ID, USER_B_ID]))

      const res  = await GET(makeGetRequest(), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(403)
      expect(body.error.code).toBe("FORBIDDEN")
    })
  })

  describe("cenário 8 — paginação: ?page=2&limit=20", () => {
    it("resposta contém meta com page, limit, total e hasMore", async () => {
      mockResolveUserId.mockResolvedValue(USER_A_ID)
      mockConversationFindUnique.mockResolvedValue(makeConversation())
      mockMessageFindMany.mockResolvedValue([])
      mockMessageCount.mockResolvedValue(45)

      const res  = await GET(makeGetRequest("?page=2&limit=20"), makeParams())
      const body = await res.json() as { data: { meta: { page: number; limit: number; total: number; hasMore: boolean } } }

      expect(res.status).toBe(200)
      expect(body.data.meta.page).toBe(2)
      expect(body.data.meta.limit).toBe(20)
      expect(body.data.meta.total).toBe(45)
    })

    it("hasMore = true quando skip + messages.length < total", async () => {
      mockResolveUserId.mockResolvedValue(USER_A_ID)
      mockConversationFindUnique.mockResolvedValue(makeConversation())
      // page=1, limit=10, total=30 → skip=0, 10 msgs → 0+10 < 30 → hasMore=true
      mockMessageFindMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id:        `msg-${i}`,
          senderId:  USER_A_ID,
          content:   `Mensagem ${i}`,
          readAt:    null,
          createdAt: new Date(),
          sender:    { id: USER_A_ID, name: "User alpha" },
        })),
      )
      mockMessageCount.mockResolvedValue(30)

      const res  = await GET(makeGetRequest("?page=1&limit=10"), makeParams())
      const body = await res.json() as { data: { meta: { hasMore: boolean } } }

      expect(body.data.meta.hasMore).toBe(true)
    })
  })

  describe("sem autenticação", () => {
    it("userId não resolvido → 401", async () => {
      mockResolveUserId.mockResolvedValue(null)

      const res  = await GET(makeGetRequest(), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(401)
      expect(body.error.code).toBe("UNAUTHORIZED")
    })
  })
})

describe("POST /api/conversations/[id]/messages", () => {

  describe("cenário 3 — mensagem válida → 201, senderId = usuário logado", () => {
    it("mensagem com content → 201, senderId bate com userId da sessão", async () => {
      mockResolveUserId.mockResolvedValue(USER_A_ID)
      mockConversationFindUnique.mockResolvedValue(makeConversation())
      mockMessageCreate.mockResolvedValue({
        id:             "msg-novo-001",
        conversationId: CONV_ID,
        senderId:       USER_A_ID,
        content:        "Quero alugar amanhã.",
        readAt:         null,
        createdAt:      new Date(),
      })

      const res  = await POST(makePostRequest({ content: "Quero alugar amanhã." }), makeParams())
      const body = await res.json() as { data: { senderId: string } }

      expect(res.status).toBe(201)
      expect(body.data.senderId).toBe(USER_A_ID)
    })

    it("aceita campo 'body' como alias de 'content'", async () => {
      mockResolveUserId.mockResolvedValue(USER_B_ID)
      mockConversationFindUnique.mockResolvedValue(makeConversation())
      mockMessageCreate.mockResolvedValue({
        id:             "msg-novo-002",
        conversationId: CONV_ID,
        senderId:       USER_B_ID,
        content:        "Combinado!",
        readAt:         null,
        createdAt:      new Date(),
      })

      const res = await POST(makePostRequest({ body: "Combinado!" }), makeParams())
      expect(res.status).toBe(201)
    })
  })

  describe("cenário 4 — mensagem com content vazio → 400", () => {
    it("content vazio string → 400 CONTENT_REQUIRED", async () => {
      mockResolveUserId.mockResolvedValue(USER_A_ID)
      mockConversationFindUnique.mockResolvedValue(makeConversation())

      const res  = await POST(makePostRequest({ content: "" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("CONTENT_REQUIRED")
    })

    it("body ausente no payload → 400", async () => {
      mockResolveUserId.mockResolvedValue(USER_A_ID)
      mockConversationFindUnique.mockResolvedValue(makeConversation())

      const res = await POST(makePostRequest({}), makeParams())
      expect(res.status).toBe(400)
    })
  })

  describe("cenário 5 — XSS: tags HTML removidas antes de salvar", () => {
    it("mensagem com <script> tem tags removidas e é salva como texto puro", async () => {
      const maliciousInput = "<script>alert(1)</script>Mensagem legítima"
      // A rota aplica: .replace(/<[^>]*>/g, "").trim()
      // Resultado esperado salvo: "Mensagem legítima"
      const sanitizedContent = "Mensagem legítima"

      mockResolveUserId.mockResolvedValue(USER_A_ID)
      mockConversationFindUnique.mockResolvedValue(makeConversation())
      mockMessageCreate.mockImplementation(({ data }: { data: { content: string } }) => {
        return Promise.resolve({
          id:             "msg-xss",
          conversationId: CONV_ID,
          senderId:       USER_A_ID,
          content:        data.content, // o que foi realmente salvo
          readAt:         null,
          createdAt:      new Date(),
        })
      })

      const res  = await POST(makePostRequest({ content: maliciousInput }), makeParams())
      const body = await res.json() as { data: { body: string } }

      expect(res.status).toBe(201)
      // Verifica que a tag script foi removida
      expect(body.data.body).not.toContain("<script>")
      expect(body.data.body).toBe(sanitizedContent)
    })

    it("mensagem com <img onerror=...> tem tags removidas", async () => {
      const xssImg = '<img src="x" onerror="alert(1)">Texto válido'
      const sanitized = "Texto válido"

      mockResolveUserId.mockResolvedValue(USER_A_ID)
      mockConversationFindUnique.mockResolvedValue(makeConversation())
      mockMessageCreate.mockImplementation(({ data }: { data: { content: string } }) =>
        Promise.resolve({
          id: "msg-xss-img", conversationId: CONV_ID, senderId: USER_A_ID,
          content: data.content, readAt: null, createdAt: new Date(),
        }),
      )

      const res  = await POST(makePostRequest({ content: xssImg }), makeParams())
      const body = await res.json() as { data: { body: string } }

      expect(res.status).toBe(201)
      expect(body.data.body).toBe(sanitized)
      expect(body.data.body).not.toContain("onerror")
    })

    it("mensagem que é só tags HTML (sem texto) resulta em content vazio → 400", async () => {
      // "<script>alert(1)</script>" → após sanitize → "" → trim() → ""
      // O MessageSchema exige min(1), então a rota retorna 400
      mockResolveUserId.mockResolvedValue(USER_A_ID)
      mockConversationFindUnique.mockResolvedValue(makeConversation())

      const res = await POST(makePostRequest({ content: "<script>alert(1)</script>" }), makeParams())
      // Após remoção de tags o conteúdo fica vazio; a validação Zod rejeita min(1)
      expect(res.status).toBe(400)
    })
  })

  describe("cenário 6 — mensagem muito longa (>2000 chars) → 400", () => {
    it("content com 2001 chars → 400", async () => {
      mockResolveUserId.mockResolvedValue(USER_A_ID)
      mockConversationFindUnique.mockResolvedValue(makeConversation())

      const res  = await POST(makePostRequest({ content: "a".repeat(2001) }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("CONTENT_REQUIRED")
    })

    it("content com exatamente 2000 chars → 201", async () => {
      mockResolveUserId.mockResolvedValue(USER_A_ID)
      mockConversationFindUnique.mockResolvedValue(makeConversation())
      mockMessageCreate.mockResolvedValue({
        id: "msg-2k", conversationId: CONV_ID, senderId: USER_A_ID,
        content: "a".repeat(2000), readAt: null, createdAt: new Date(),
      })

      const res = await POST(makePostRequest({ content: "a".repeat(2000) }), makeParams())
      expect(res.status).toBe(201)
    })
  })

  describe("cenário 7 — POST em conversa que o usuário não participa → 403", () => {
    it("não-participante tenta enviar mensagem → 403 FORBIDDEN", async () => {
      mockResolveUserId.mockResolvedValue(THIRD_ID)
      mockConversationFindUnique.mockResolvedValue(makeConversation([USER_A_ID, USER_B_ID]))

      const res  = await POST(makePostRequest({ content: "Intruso enviando msg" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(403)
      expect(body.error.code).toBe("FORBIDDEN")
    })
  })

  describe("cenário 9 — senderId nunca sobrescrito pelo client", () => {
    it("body com senderId falso não sobrescreve o userId da sessão", async () => {
      const attackerSenderId = "usuario-falso-999"

      mockResolveUserId.mockResolvedValue(USER_A_ID)
      mockConversationFindUnique.mockResolvedValue(makeConversation())

      let capturedSenderId: string | undefined

      mockMessageCreate.mockImplementation(({ data }: { data: { senderId: string; content: string } }) => {
        capturedSenderId = data.senderId
        return Promise.resolve({
          id:             "msg-sec",
          conversationId: CONV_ID,
          senderId:       data.senderId,
          content:        data.content,
          readAt:         null,
          createdAt:      new Date(),
        })
      })

      // Envia content + um senderId malicioso no body — a rota deve ignorar o senderId do body
      const res = await POST(
        makePostRequest({ content: "Mensagem real", senderId: attackerSenderId }),
        makeParams(),
      )

      expect(res.status).toBe(201)
      // A rota usa `userId` da sessão (resolveUserId), não o senderId do body
      expect(capturedSenderId).toBe(USER_A_ID)
      expect(capturedSenderId).not.toBe(attackerSenderId)
    })

    it("response.data.senderId bate com o usuário autenticado, não com o payload do client", async () => {
      mockResolveUserId.mockResolvedValue(USER_B_ID)
      mockConversationFindUnique.mockResolvedValue(makeConversation())
      mockMessageCreate.mockResolvedValue({
        id:             "msg-sec-b",
        conversationId: CONV_ID,
        senderId:       USER_B_ID, // sempre o da sessão
        content:        "Olá",
        readAt:         null,
        createdAt:      new Date(),
      })

      const res  = await POST(
        makePostRequest({ content: "Olá", senderId: "hacker-id-000" }),
        makeParams(),
      )
      const body = await res.json() as { data: { senderId: string } }

      expect(body.data.senderId).toBe(USER_B_ID)
    })
  })

  describe("sem autenticação", () => {
    it("userId não resolvido → 401", async () => {
      mockResolveUserId.mockResolvedValue(null)

      const res  = await POST(makePostRequest({ content: "Sem auth" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(401)
      expect(body.error.code).toBe("UNAUTHORIZED")
    })
  })
})
