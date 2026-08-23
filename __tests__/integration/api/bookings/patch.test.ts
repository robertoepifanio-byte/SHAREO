/** @jest-environment node */
/**
 * P1-11 — Testes de integração para PATCH /api/bookings/[id]
 *
 * Arquivo fonte: app/api/bookings/[id]/route.ts
 *
 * Transições de estado:
 *   PENDING  → confirm (owner)        → CONFIRMED
 *   PENDING  → cancel  (both)         → CANCELLED
 *   CONFIRMED → mark_active (owner)   → ACTIVE
 *   CONFIRMED → cancel  (both)        → CANCELLED
 *   ACTIVE   → mark_returned (borrower) → RETURNED
 *   ACTIVE   → open_dispute (both)    → DISPUTED
 *   RETURNED → confirm (owner)        → COMPLETED  [via "mark_returned" semântica — veja TRANSITIONS]
 *   COMPLETED / CANCELLED → qualquer  → 400/422
 */

import { NextRequest } from "next/server"
import { PATCH } from "@/app/api/bookings/[id]/route"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockBookingFindUnique = jest.fn()
const mockBookingFindFirst  = jest.fn().mockResolvedValue(null) // sem conflito de datas
const mockBookingUpdate     = jest.fn()
const mockBookingUpdateMany = jest.fn().mockResolvedValue({ count: 1 }) // mark_active: token ainda não consumido
const mockBookingFindUniqueOrThrow = jest.fn()
const mockBookingItemFindFirst = jest.fn().mockResolvedValue(null) // Story B: disponibilidade via booking_items, sem conflito
const mockNotificationCreate = jest.fn()
// Foto de devolução: `mark_returned` conta as fotos CHECKOUT e recusa quando é 0.
// Padrão 1 (foto enviada) para não reescrever os testes que só atravessam o ciclo;
// o teste do guard zera explicitamente.
const mockBookingPhotoCount  = jest.fn()

// S14-A-05/A-06: `confirm` roda dentro de prisma.$transaction (tx.booking.findFirst + update);
// `mark_active` usa booking.updateMany (compare-and-swap) + findUniqueOrThrow.
jest.mock("@/lib/prisma", () => {
  const booking = {
    findUnique:        (...args: unknown[]) => mockBookingFindUnique(...args),
    findFirst:         (...args: unknown[]) => mockBookingFindFirst(...args),
    update:            (...args: unknown[]) => mockBookingUpdate(...args),
    updateMany:        (...args: unknown[]) => mockBookingUpdateMany(...args),
    findUniqueOrThrow: (...args: unknown[]) => mockBookingFindUniqueOrThrow(...args),
  }
  const bookingItem = {
    findFirst: (...args: unknown[]) => mockBookingItemFindFirst(...args),
  }
  return {
    prisma: {
      booking,
      bookingItem,
      notification: {
        create: (...args: unknown[]) => mockNotificationCreate(...args),
      },
      bookingPhoto: {
        count: (...args: unknown[]) => mockBookingPhotoCount(...args),
      },
      ownerPaymentAccount: {
        findUnique: jest.fn().mockResolvedValue(null), // sem conta PIX → pula criação de payout
      },
      payout: {
        create: jest.fn().mockResolvedValue({}),
      },
      platformConfig: {
        findUnique: jest.fn().mockResolvedValue(null), // getters caem nos defaults
        findMany:   jest.fn().mockResolvedValue([]),
      },
      // confirm usa transação serializável; o mock executa o callback com um tx que reusa os mesmos mocks.
      $transaction: (fn: (tx: unknown) => unknown) => fn({ booking, bookingItem }),
    },
  }
})

const mockAuth = jest.fn()
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}))

jest.mock("@/lib/email", () => ({
  sendBookingConfirmedEmail: jest.fn().mockResolvedValue(undefined),
  sendBookingCancelledEmail: jest.fn().mockResolvedValue(undefined),
  sendReturnInProgressEmail: jest.fn().mockResolvedValue(undefined),
  sendReturnCompletedEmail:  jest.fn().mockResolvedValue(undefined),
  bookingItemsLabel: (mainTitle: string, totalItems: number) =>
    totalItems > 1 ? `${mainTitle} + mais ${totalItems - 1} ${totalItems - 1 === 1 ? "item" : "itens"}` : mainTitle,
}))

jest.mock("@/lib/outboundWebhooks", () => ({
  dispatchWebhookEvent: jest.fn().mockResolvedValue(undefined),
}))

jest.mock("@/lib/cancellationPolicy", () => ({
  calcRefund: jest.fn().mockReturnValue({
    refundAmount:  100,
    refundPercent: 100,
    reason:        "Cancelado com antecedência",
  }),
}))

// ---------------------------------------------------------------------------
// IDs de referência
// ---------------------------------------------------------------------------

const OWNER_ID    = "owner-id-001"
const BORROWER_ID = "borrower-id-002"
const THIRD_ID    = "third-id-003"
const BOOKING_ID  = "booking-id-abc"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Cria uma NextRequest para PATCH /api/bookings/[id] com body JSON. */
function makeReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost:3000/api/bookings/${BOOKING_ID}`, {
    method:  "PATCH",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  })
}

/** Params do Next.js (Promise com { id }). */
function makeParams(id = BOOKING_ID) {
  return { params: Promise.resolve({ id }) }
}

/** Cria um booking mockado com os dados fornecidos. */
function makeBooking(overrides: {
  status?: string
  ownerId?: string
  borrowerId?: string
  /** Rua do proprietário — `null` simula quem ainda não cadastrou endereço. */
  ownerStreet?: string | null
  /** Reservas de teste nascem NÃO pagas, como no fluxo real. */
  paymentStatus?: string
}) {
  return {
    id:          BOOKING_ID,
    status:      overrides.status      ?? "PENDING",
    ownerId:     overrides.ownerId     ?? OWNER_ID,
    borrowerId:  overrides.borrowerId  ?? BORROWER_ID,
    startDate:   new Date("2026-06-10T00:00:00Z"),
    endDate:     new Date("2026-06-15T00:00:00Z"),
    totalPrice:  300,
    totalDays:   2,
    paymentStatus: overrides.paymentStatus ?? "PENDING",
    bookingItems: [{ itemId: "item-id-004" }], // Story B — confirm revalida todos os itens
    item:        { title: "Furadeira Bosch" },
    borrower:    { email: "borrower@ex.com", name: "Locatário Teste" },
    // `street` preenchido por padrão: endereço completo virou exigência do
    // `confirm` em 22/08/2026 — o locatário precisa saber onde retirar o item.
    owner: {
      email:  "owner@ex.com",
      name:   "Proprietário Teste",
      street: overrides.ownerStreet === undefined ? "Rua das Flores, 100" : overrides.ownerStreet,
    },
  }
}

/** Cria uma sessão autenticada para o usuário indicado. */
function makeSession(userId: string, role = "USER") {
  return { user: { id: userId, role } }
}

/** Resultado de booking.update bem-sucedido. */
function makeUpdatedBooking(status: string) {
  return { id: BOOKING_ID, status, updatedAt: new Date() }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks()
  mockNotificationCreate.mockResolvedValue({})
  mockBookingPhotoCount.mockResolvedValue(1)
})

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("PATCH /api/bookings/[id]", () => {

  // --------------------------------------------------------------------------
  // 1. PENDING + confirm (owner) → 200, status CONFIRMED
  // --------------------------------------------------------------------------
  describe("transições de estado válidas", () => {
    it("PENDING + confirm pelo owner → 200, status CONFIRMED", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "PENDING" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("CONFIRMED"))

      const res  = await PATCH(makeReq({ action: "confirm" }), makeParams())
      const body = await res.json() as { data: { status: string } }

      expect(res.status).toBe(200)
      expect(body.data.status).toBe("CONFIRMED")
    })

    /**
     * Endereço completo é exigência NO MOMENTO DA LOCAÇÃO, não no cadastro
     * (regra dos fundadores, 22/08/2026).
     *
     * O que motivou: a tela do locatário mostrava "Natal — RN" como local de
     * retirada, com a advertência "não aceite outro local" — mandando alguém a
     * uma cidade inteira. 41 dos 46 donos de item do staging não tinham rua.
     */
    it("confirm sem endereço do proprietário → 422 OWNER_ADDRESS_REQUIRED", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "PENDING", ownerStreet: null }))

      const res  = await PATCH(makeReq({ action: "confirm" }), makeParams())
      const body = await res.json() as { error: { code: string; message: string } }

      expect(res.status).toBe(422)
      expect(body.error.code).toBe("OWNER_ADDRESS_REQUIRED")
      // A mensagem precisa dizer PARA ONDE ir — erro sem saída é erro pela metade.
      expect(body.error.message).toMatch(/Endereço/i)
      expect(mockBookingUpdate).not.toHaveBeenCalled()
    })

    it("rua só com espaços não conta como endereço", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "PENDING", ownerStreet: "   " }))

      const res = await PATCH(makeReq({ action: "confirm" }), makeParams())
      expect(res.status).toBe(422)
    })

    it("🪤 a exigência é SÓ do confirm — cancelar sem endereço continua possível", async () => {
      // Prender o proprietário numa locação que ele não consegue nem recusar
      // seria pior que o problema original.
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "PENDING", ownerStreet: null }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("CANCELLED"))

      const res = await PATCH(makeReq({ action: "cancel", reason: "Item indisponível" }), makeParams())
      expect(res.status).toBe(200)
    })

    /**
     * 🪤 Cancelar uma reserva NUNCA PAGA gravava `refundAmount > 0` — um valor a
     * devolver que ninguém pagou. Como o estorno é executado à mão no painel da
     * Stripe, esse número ia parar na fila de trabalho de uma pessoa como se
     * fosse real. Achado do painel de dois atores, 22/08/2026.
     */
    it("cancelar reserva NÃO paga não registra reembolso", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "CONFIRMED", paymentStatus: "PENDING" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("CANCELLED"))

      await PATCH(makeReq({ action: "cancel", reason: "Mudei de ideia" }), makeParams())

      expect(mockBookingUpdate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ refundAmount: 0, refundPercent: 0 }),
      }))
    })

    it("cancelar reserva PAGA continua calculando o reembolso pela política", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "CONFIRMED", paymentStatus: "PAID" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("CANCELLED"))

      await PATCH(makeReq({ action: "cancel", reason: "Mudei de ideia" }), makeParams())

      // calcRefund está mockado devolvendo 100/100 no topo do arquivo.
      expect(mockBookingUpdate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ refundAmount: 100, refundPercent: 100 }),
      }))
    })

    /**
     * 🪤 `mark_active` recalculava o `endDate` a partir da retirada real mas
     * deixava o `startDate` na data reservada. Retirada antecipada produzia
     * início DEPOIS do fim, e a lista do locatário exibia o período invertido.
     */
    it("mark_active deixa o período coerente — início na retirada real, não depois do fim", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue({
        ...makeBooking({ status: "CONFIRMED" }),
        pickupToken:       "123456",
        pickupTokenUsedAt: null,
      })
      mockBookingFindUniqueOrThrow.mockResolvedValue(makeUpdatedBooking("ACTIVE"))

      // Reserva marcada para 10/06; retirada acontece ANTES, em 01/06.
      const retirada = "2026-06-01T14:00:00.000Z"
      await PATCH(
        makeReq({ action: "mark_active", pickupToken: "123456", actualTime: retirada }),
        makeParams(),
      )

      const data = mockBookingUpdateMany.mock.calls[0][0].data as { startDate: Date; endDate: Date }
      expect(data.startDate.toISOString()).toBe(retirada)
      expect(data.endDate.getTime()).toBeGreaterThan(data.startDate.getTime())
    })

    // Story B / ARQ-CRIT-01 — confirm revalida TODOS os itens da locação:
    // se um item (principal OU secundário) já estiver reservado no período → 409
    it("PENDING + confirm com item da locação já reservado → 409 DATE_CONFLICT", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "PENDING" }))
      mockBookingItemFindFirst.mockResolvedValueOnce({ itemId: "item-id-004" }) // conflito num item da locação

      const res  = await PATCH(makeReq({ action: "confirm" }), makeParams())
      const body = await res.json() as { error?: { code?: string } }

      expect(res.status).toBe(409)
      expect(body.error?.code).toBe("DATE_CONFLICT")
    })

    // 2. PENDING + cancel (borrower, com reason) → 200, status CANCELLED
    it("PENDING + cancel pelo borrower com reason → 200, status CANCELLED", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "PENDING" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("CANCELLED"))

      const res  = await PATCH(makeReq({ action: "cancel", reason: "Não preciso mais." }), makeParams())
      const body = await res.json() as { data: { status: string } }

      expect(res.status).toBe(200)
      expect(body.data.status).toBe("CANCELLED")
    })

    // 3. CONFIRMED + mark_active (owner) → 200, status ACTIVE
    // mark_active exige pickupToken válido (gerado no confirm)
    it("CONFIRMED + mark_active pelo owner → 200, status ACTIVE", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue({
        ...makeBooking({ status: "CONFIRMED" }),
        pickupToken:       "123456",
        pickupTokenUsedAt: null,
        totalDays:         5,
      })
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("ACTIVE"))
      mockBookingFindUniqueOrThrow.mockResolvedValue(makeUpdatedBooking("ACTIVE"))

      const res  = await PATCH(makeReq({ action: "mark_active", pickupToken: "123456" }), makeParams())
      const body = await res.json() as { data: { status: string } }

      expect(res.status).toBe(200)
      expect(body.data.status).toBe("ACTIVE")
    })

    // 4. CONFIRMED + cancel (owner, com reason) → 200, status CANCELLED
    it("CONFIRMED + cancel pelo owner com reason → 200, status CANCELLED", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "CONFIRMED" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("CANCELLED"))

      const res  = await PATCH(makeReq({ action: "cancel", reason: "Conflito de agenda." }), makeParams())
      const body = await res.json() as { data: { status: string } }

      expect(res.status).toBe(200)
      expect(body.data.status).toBe("CANCELLED")
    })

    // 5. ACTIVE + mark_returned (borrower) → 200, status RETURNED
    it("ACTIVE + mark_returned pelo borrower → 200, status RETURNED", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "ACTIVE" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("RETURNED"))

      const res  = await PATCH(makeReq({ action: "mark_returned" }), makeParams())
      const body = await res.json() as { data: { status: string } }

      expect(res.status).toBe(200)
      expect(body.data.status).toBe("RETURNED")
    })

    // 5b. Guard da foto de devolução (decisão do fundador, 2026-08-23).
    //
    // A regressão que isto trava: o checklist pedia 3 de 4 itens e tratava a foto
    // como "recomendado", então dava para atestar "item limpo e no estado
    // recebido" e, em seguida, abrir disputa dizendo que não funciona — sem uma
    // única imagem para arbitrar. Uma locação fechou assim em staging com ZERO
    // fotos. O guard fica na API porque o app mobile e chamadas diretas passam
    // pelo mesmo ponto; travar só no ReturnChecklist não cobriria nenhum dos dois.
    it("ACTIVE + mark_returned sem foto de devolução → 422 RETURN_PHOTO_REQUIRED", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "ACTIVE" }))
      mockBookingPhotoCount.mockResolvedValue(0)

      const res  = await PATCH(makeReq({ action: "mark_returned" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(422)
      expect(body.error.code).toBe("RETURN_PHOTO_REQUIRED")
      // A transição NÃO pode ter acontecido.
      expect(mockBookingUpdate).not.toHaveBeenCalled()
    })

    it("mark_returned conta apenas fotos da fase CHECKOUT", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "ACTIVE" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("RETURNED"))

      await PATCH(makeReq({ action: "mark_returned" }), makeParams())

      // Sem o filtro de fase, uma foto de RETIRADA liberaria a devolução.
      expect(mockBookingPhotoCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ phase: "CHECKOUT" }) }),
      )
    })

    // 6. ACTIVE + open_dispute (borrower, com reason) → 200, status DISPUTED
    it("ACTIVE + open_dispute pelo borrower com reason → 200, status DISPUTED", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "ACTIVE" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("DISPUTED"))

      const res  = await PATCH(makeReq({ action: "open_dispute", reason: "Item chegou danificado." }), makeParams())
      const body = await res.json() as { data: { status: string } }

      expect(res.status).toBe(200)
      expect(body.data.status).toBe("DISPUTED")
    })

    /**
     * 🪤 O motivo da disputa era EXIGIDO e depois DESCARTADO: só o branch de
     * `cancel` gravava `cancelReason`. A disputa entrava no banco sem
     * justificativa, e quem fosse arbitrar abria o caso sem saber do que se
     * tratava. Achado do painel de dois atores, 22/08/2026.
     */
    it("open_dispute GRAVA o motivo — antes ele era exigido e jogado fora", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "ACTIVE" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("DISPUTED"))

      await PATCH(makeReq({ action: "open_dispute", reason: "Furadeira não liga." }), makeParams())

      expect(mockBookingUpdate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ cancelReason: "Furadeira não liga." }),
      }))
    })

    it("open_dispute NOTIFICA a outra parte, dizendo quem abriu", async () => {
      // Antes não havia entrada de open_dispute no notifMap: a outra parte só
      // descobria a disputa ao abrir o app por conta própria.
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "ACTIVE" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("DISPUTED"))

      await PATCH(makeReq({ action: "open_dispute", reason: "Furadeira não liga." }), makeParams())

      expect(mockNotificationCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          userId: OWNER_ID, // quem recebe é o OUTRO lado
          title:  "Disputa aberta",
          // e o texto nomeia quem AGIU, não quem recebe
          body:   expect.stringContaining("locatário abriu uma disputa"),
        }),
      }))
    })

    it("quando o LOCADOR abre, o locatário é notificado e o texto diz 'locador'", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "ACTIVE" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("DISPUTED"))

      await PATCH(makeReq({ action: "open_dispute", reason: "Devolvido com risco fundo." }), makeParams())

      expect(mockNotificationCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          userId: BORROWER_ID,
          body:   expect.stringContaining("locador abriu uma disputa"),
        }),
      }))
    })

    // 7. RETURNED + confirm_return (owner) → 200, status COMPLETED
    it("RETURNED + confirm_return pelo owner → 200, status COMPLETED", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "RETURNED" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("COMPLETED"))

      const res  = await PATCH(makeReq({ action: "confirm_return" }), makeParams())
      const body = await res.json() as { data: { status: string } }

      expect(res.status).toBe(200)
      expect(body.data.status).toBe("COMPLETED")
    })

    // 8. RETURNED + open_dispute (owner) → 200, status DISPUTED
    // open_dispute aceita RETURNED como status de origem (requiredStatus inclui "RETURNED").
    // Nota: a rota não expõe uma ação "complete" explícita — a conclusão de locação
    // pode ser tratada via lógica de negócio ou webhook externo.
    it("RETURNED + open_dispute pelo owner com reason → 200, status DISPUTED", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "RETURNED" }))
      mockBookingUpdate.mockResolvedValue(makeUpdatedBooking("DISPUTED"))

      const res  = await PATCH(makeReq({ action: "open_dispute", reason: "Verificando danos." }), makeParams())
      const body = await res.json() as { data: { status: string } }

      expect(res.status).toBe(200)
      expect(body.data.status).toBe("DISPUTED")
    })
  })

  // --------------------------------------------------------------------------
  // confirm_return — status errado e idempotência
  // --------------------------------------------------------------------------
  describe("confirm_return — transições inválidas", () => {
    it("ACTIVE + confirm_return pelo owner → 422 INVALID_TRANSITION", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "ACTIVE" }))

      const res  = await PATCH(makeReq({ action: "confirm_return" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect([400, 422]).toContain(res.status)
      expect(body.error.code).toBe("INVALID_TRANSITION")
    })

    it("COMPLETED + confirm_return pelo owner → 422 INVALID_TRANSITION (idempotência)", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "COMPLETED" }))

      const res  = await PATCH(makeReq({ action: "confirm_return" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect([400, 422]).toContain(res.status)
      expect(body.error.code).toBe("INVALID_TRANSITION")
    })
  })

  // --------------------------------------------------------------------------
  // 8 e 9. Estados terminais — COMPLETED e CANCELLED rejeitam qualquer ação
  // --------------------------------------------------------------------------
  describe("estados terminais (COMPLETED e CANCELLED)", () => {
    it("COMPLETED + confirm → 422 INVALID_TRANSITION", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "COMPLETED" }))

      const res  = await PATCH(makeReq({ action: "confirm" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect([400, 422]).toContain(res.status)
      expect(body.error.code).toBe("INVALID_TRANSITION")
    })

    it("CANCELLED + mark_active → 422 INVALID_TRANSITION", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "CANCELLED" }))

      const res  = await PATCH(makeReq({ action: "mark_active" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect([400, 422]).toContain(res.status)
      expect(body.error.code).toBe("INVALID_TRANSITION")
    })
  })

  // --------------------------------------------------------------------------
  // 10. Borrower tenta confirm (somente owner pode) → 403
  // --------------------------------------------------------------------------
  describe("restrições de papel (role)", () => {
    it("borrower tenta confirm → 403 FORBIDDEN", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "PENDING" }))

      const res  = await PATCH(makeReq({ action: "confirm" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(403)
      expect(body.error.code).toBe("FORBIDDEN")
    })

    // 11. Borrower tenta confirm_return (somente owner pode) → 403
    it("borrower tenta confirm_return → 403 FORBIDDEN", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "RETURNED" }))

      const res  = await PATCH(makeReq({ action: "confirm_return" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(403)
      expect(body.error.code).toBe("FORBIDDEN")
    })

    // 12. Owner tenta mark_returned (somente borrower pode) → 403
    it("owner tenta mark_returned → 403 FORBIDDEN", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "ACTIVE" }))

      const res  = await PATCH(makeReq({ action: "mark_returned" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(403)
      expect(body.error.code).toBe("FORBIDDEN")
    })
  })

  // --------------------------------------------------------------------------
  // 12. cancel sem reason → 400
  // --------------------------------------------------------------------------
  describe("validação de payload", () => {
    it("cancel sem reason → 400 VALIDATION_ERROR", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      // findUnique não deve ser chamado — validação Zod rejeita antes
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "PENDING" }))

      const res  = await PATCH(makeReq({ action: "cancel" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })

    it("open_dispute sem reason → 400 VALIDATION_ERROR", async () => {
      mockAuth.mockResolvedValue(makeSession(BORROWER_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "ACTIVE" }))

      const res  = await PATCH(makeReq({ action: "open_dispute" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(400)
      expect(body.error.code).toBe("VALIDATION_ERROR")
    })
  })

  // --------------------------------------------------------------------------
  // 13. Usuário não-participante → 403
  // --------------------------------------------------------------------------
  describe("autorização — não-participante", () => {
    it("usuário sem vínculo com a reserva → 403 FORBIDDEN", async () => {
      mockAuth.mockResolvedValue(makeSession(THIRD_ID))
      mockBookingFindUnique.mockResolvedValue(makeBooking({ status: "PENDING" }))

      const res  = await PATCH(makeReq({ action: "confirm" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(403)
      expect(body.error.code).toBe("FORBIDDEN")
    })
  })

  // --------------------------------------------------------------------------
  // 14. Booking não encontrado → 404
  // --------------------------------------------------------------------------
  describe("booking inexistente", () => {
    it("booking não encontrado → 404 BOOKING_NOT_FOUND", async () => {
      mockAuth.mockResolvedValue(makeSession(OWNER_ID))
      mockBookingFindUnique.mockResolvedValue(null)

      const res  = await PATCH(makeReq({ action: "confirm" }), makeParams("id-que-nao-existe"))
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(404)
      expect(body.error.code).toBe("BOOKING_NOT_FOUND")
    })
  })

  // --------------------------------------------------------------------------
  // Autenticação ausente → 401
  // --------------------------------------------------------------------------
  describe("sem autenticação", () => {
    it("sem sessão → 401 UNAUTHORIZED", async () => {
      mockAuth.mockResolvedValue(null)

      const res  = await PATCH(makeReq({ action: "confirm" }), makeParams())
      const body = await res.json() as { error: { code: string } }

      expect(res.status).toBe(401)
      expect(body.error.code).toBe("UNAUTHORIZED")
    })
  })
})
