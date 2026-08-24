/**
 * POST   /api/bookings/[id]/extend  — locatário solicita extensão de prazo
 * PATCH  /api/bookings/[id]/extend  — proprietário aprova ou recusa a solicitação
 *
 * P1-27 — Extensão de prazo de locação
 *
 * Nota: os campos extensionRequestedEndDate, extensionStatus, extensionRequestedAt,
 * extensionRespondedAt foram adicionados na migration 20260530100000.
 * Enquanto o cliente Prisma não for regenerado (prisma generate), usamos
 * $queryRaw / $executeRaw para acessar esses campos.
 */

import { NextResponse, after, type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { diasExtras, valorExtensao, aplicarExtensao } from "@/lib/payments/extension"
import { formatPrice } from "@/utils/format"

type Params = { params: Promise<{ id: string }> }

// Locatário solicita extensão
const PostExtendSchema = z.object({
  newEndDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida. Use o formato YYYY-MM-DD."),
})

// Proprietário responde à solicitação
const PatchExtendSchema = z.object({
  action: z.enum(["approve", "reject"], {
    errorMap: () => ({ message: "Ação inválida. Use 'approve' ou 'reject'." }),
  }),
})

interface BookingExtRow {
  id:                       string
  status:                   string
  borrowerId:               string
  ownerId:                  string
  endDate:                  Date
  itemTitle:                string
  extensionStatus:          string | null
  extensionRequestedEndDate: Date | null
  paymentStatus:            string
  dailyPrice:               number
}

/** POST — locatário solicita nova data de devolução */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const { id } = await params
    const body   = await req.json()
    const parsed = PostExtendSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos." } },
        { status: 400 },
      )
    }

    const { newEndDate } = parsed.data
    const userId          = session.user.id

    const rows = await prisma.$queryRaw<BookingExtRow[]>`
      SELECT
        b.id,
        b.status,
        b."borrowerId",
        b."ownerId",
        b."endDate",
        i.title AS "itemTitle",
        b."extensionStatus",
        b."extensionRequestedEndDate"
      FROM bookings b
      JOIN items i ON i.id = b."itemId"
      WHERE b.id = ${id}
        AND b."deletedAt" IS NULL
        AND i."deletedAt" IS NULL
      LIMIT 1
    `
    const booking = rows[0]

    if (!booking) {
      return NextResponse.json(
        { error: { code: "BOOKING_NOT_FOUND", message: "Reserva não encontrada." } },
        { status: 404 },
      )
    }

    if (booking.borrowerId !== userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Apenas o locatário pode solicitar extensão." } },
        { status: 403 },
      )
    }

    if (booking.status !== "ACTIVE") {
      return NextResponse.json(
        { error: { code: "INVALID_STATUS", message: "Extensão só pode ser solicitada em reservas ativas." } },
        { status: 422 },
      )
    }

    if (booking.extensionStatus === "PENDING") {
      return NextResponse.json(
        { error: { code: "EXTENSION_PENDING", message: "Já existe uma solicitação de extensão aguardando resposta." } },
        { status: 409 },
      )
    }

    // 🪤 `new Date("2026-08-27")` é meia-noite UTC — que no Brasil (UTC−3) é
    // 26/08 às 21:00. A notificação dizia 27, a tela dizia 26. Ancorar ao
    // meio-dia LOCAL é a convenção do projeto para datas de reserva (ver
    // startOfTodayBR em lib/validations/bookings.ts).
    const requestedDate = new Date(`${newEndDate}T12:00:00`)
    if (requestedDate <= new Date(booking.endDate)) {
      return NextResponse.json(
        { error: { code: "INVALID_DATE", message: "A nova data deve ser posterior à data de devolução atual." } },
        { status: 400 },
      )
    }

    const now = new Date()
    await prisma.$executeRaw`
      UPDATE bookings
      SET
        "extensionRequestedEndDate" = ${requestedDate},
        "extensionStatus"           = 'PENDING',
        "extensionRequestedAt"      = ${now},
        "extensionRespondedAt"      = NULL,
        "updatedAt"                 = ${now}
      WHERE id = ${id}
    `

    // Notifica o proprietário — após a resposta
    after(() =>
      prisma.notification.create({
        data: {
          userId: booking.ownerId,
          type:   "EXTENSION_REQUESTED",
          title:  "Solicitação de extensão",
          body:   `O locatário solicitou estender a devolução de "${booking.itemTitle}" até ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(requestedDate)}.`,
          data:   { bookingId: id },
        },
      }).catch((e) => console.error("[extend] notification owner:", e instanceof Error ? e.message : e))
    )

    return NextResponse.json(
      { data: { id, extensionStatus: "PENDING", extensionRequestedEndDate: requestedDate } },
      { status: 200 },
    )
  } catch (e) {
    console.error("[POST /api/bookings/:id/extend]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}

/** PATCH — proprietário aprova ou recusa a extensão */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const { id } = await params
    const body   = await req.json()
    const parsed = PatchExtendSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos." } },
        { status: 400 },
      )
    }

    const { action } = parsed.data
    const userId      = session.user.id

    const rows = await prisma.$queryRaw<BookingExtRow[]>`
      SELECT
        b.id,
        b.status,
        b."borrowerId",
        b."ownerId",
        b."endDate",
        i.title AS "itemTitle",
        b."extensionStatus",
        b."extensionRequestedEndDate",
        b."paymentStatus",
        b."dailyPrice"
      FROM bookings b
      JOIN items i ON i.id = b."itemId"
      WHERE b.id = ${id}
        AND b."deletedAt" IS NULL
        AND i."deletedAt" IS NULL
      LIMIT 1
    `
    const booking = rows[0]

    if (!booking) {
      return NextResponse.json(
        { error: { code: "BOOKING_NOT_FOUND", message: "Reserva não encontrada." } },
        { status: 404 },
      )
    }

    if (booking.ownerId !== userId) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Apenas o proprietário pode responder à solicitação." } },
        { status: 403 },
      )
    }

    if (booking.extensionStatus !== "PENDING") {
      return NextResponse.json(
        { error: { code: "NO_PENDING_EXTENSION", message: "Não há solicitação de extensão pendente." } },
        { status: 422 },
      )
    }

    // 🪤 O POST exige ACTIVE, o PATCH não exigia nada: dava para o locatário
    // pedir extensão, devolver o item, e o proprietário aprovar depois —
    // estendendo o prazo de uma locação que já acabou e empurrando o `endDate`
    // de uma reserva RETURNED para o futuro. Achado do painel de dois atores.
    if (booking.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: {
            code:    "INVALID_STATUS",
            message: "A locação não está mais em andamento — não é possível responder à extensão.",
          },
        },
        { status: 422 },
      )
    }

    const now            = new Date()
    const isApproved     = action === "approve"
    const newExtStatus   = isApproved ? "APPROVED" : "REJECTED"

    // ATOR-03 — aprovar não pode mais estender de graça.
    //
    // Antes: aprovar empurrava o `endDate` e pronto. `totalDays`, `totalPrice` e
    // o split ficavam como estavam, então o locatário ganhava dias e o repasse
    // ao proprietário saía calculado sobre o valor antigo.
    //
    // Agora há dois caminhos, e a diferença é quem já pagou:
    //
    //  • Reserva JÁ PAGA → a extensão fica AWAITING_PAYMENT: grava só o valor
    //    das diárias extras e NÃO move o `endDate`. Ele só se move quando o
    //    pagamento confirma (webhook → aplicarExtensao). Decisão do fundador:
    //    nunca existe item emprestado a mais sem dinheiro correspondente.
    //    🪤 Não dá para reusar o checkout comum aqui — ele cobra `totalPrice`
    //    INTEIRO, o que cobraria a locação de novo.
    //
    //  • Reserva AINDA NÃO PAGA → aplica na hora e recalcula os totais. O
    //    checkout normal já cobra o `totalPrice` atualizado, então a extensão
    //    entra no mesmo pagamento e não precisa de cobrança separada.
    let aguardandoPagamento = false
    let valorExtra = 0

    if (isApproved && booking.extensionRequestedEndDate) {
      const dias = diasExtras(booking.endDate, new Date(booking.extensionRequestedEndDate))
      valorExtra = valorExtensao(booking.dailyPrice, dias)

      if (booking.paymentStatus === "PAID" && valorExtra > 0) {
        aguardandoPagamento = true
        await prisma.$executeRaw`
          UPDATE bookings
          SET
            "extensionStatus"       = 'AWAITING_PAYMENT',
            "extensionRespondedAt"  = ${now},
            "extensionAmountCents"  = ${valorExtra},
            "updatedAt"             = ${now}
          WHERE id = ${id}
        `
      } else {
        await prisma.$executeRaw`
          UPDATE bookings
          SET
            "extensionStatus"       = ${newExtStatus},
            "extensionRespondedAt"  = ${now},
            "extensionAmountCents"  = ${valorExtra},
            "updatedAt"             = ${now}
          WHERE id = ${id}
        `
        // Move a data e recalcula totais/split num ponto único, o mesmo que o
        // webhook usa — o irmão esquecido é sempre o que erra.
        await aplicarExtensao(id)
      }
    } else {
      await prisma.$executeRaw`
        UPDATE bookings
        SET
          "extensionStatus"      = ${newExtStatus},
          "extensionRespondedAt" = ${now},
          "updatedAt"            = ${now}
        WHERE id = ${id}
      `
    }

    // Notifica o locatário
    const dateStr = booking.extensionRequestedEndDate
      ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(booking.extensionRequestedEndDate))
      : ""
    // O texto precisa dizer que ainda falta pagar — senão o locatário acha que
    // ganhou os dias e só descobre no dia da devolução que a data não mudou.
    const notifBody = !isApproved
      ? `Sua solicitação de extensão para "${booking.itemTitle}" foi recusada pelo proprietário.`
      : aguardandoPagamento
        ? `O proprietário aceitou estender "${booking.itemTitle}" até ${dateStr}. Para valer, pague as diárias extras: ${formatPrice(valorExtra)}.`
        : `Sua extensão de prazo para "${booking.itemTitle}" até ${dateStr} foi aprovada.`

    after(() =>
      prisma.notification.create({
        data: {
          userId: booking.borrowerId,
          type:   isApproved ? "EXTENSION_APPROVED" : "EXTENSION_REJECTED",
          title:  !isApproved
            ? "Extensão recusada"
            : aguardandoPagamento
              ? "Extensão aceita — falta pagar"
              : "Extensão aprovada",
          body:   notifBody,
          data:   { bookingId: id },
        },
      }).catch((e) => console.error("[extend] notification borrower:", e instanceof Error ? e.message : e))
    )

    return NextResponse.json(
      {
        data: {
          id,
          extensionStatus: aguardandoPagamento ? "AWAITING_PAYMENT" : newExtStatus,
          // `endDate` só entra na resposta quando a extensão JÁ vale. Devolvê-lo
          // no caso AWAITING_PAYMENT faria a UI exibir a data nova antes do
          // pagamento — exatamente o que esta mudança evita.
          ...(isApproved && !aguardandoPagamento && booking.extensionRequestedEndDate && {
            endDate: new Date(booking.extensionRequestedEndDate),
          }),
          ...(aguardandoPagamento && { extensionAmountCents: valorExtra }),
        },
      },
      { status: 200 },
    )
  } catch (e) {
    console.error("[PATCH /api/bookings/:id/extend]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
