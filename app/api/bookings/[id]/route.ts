import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { randomInt } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { resolveUserId } from "@/lib/resolveUserId"
import { userMiniSelect } from "@/lib/prisma/selects"
import { PatchBookingSchema } from "@/lib/validations/bookings"
import type { BookingStatus } from "@prisma/client"
import { dispatchWebhookEvent } from "@/lib/outboundWebhooks"
import type { WebhookEvent } from "@/lib/outboundWebhooks"
import { sendBookingConfirmedEmail, sendBookingCancelledEmail, sendReturnInProgressEmail, sendReturnCompletedEmail, bookingItemsLabel } from "@/lib/email"
import { calcRefund } from "@/lib/cancellationPolicy"
import { getCancellationConfig, getRentalContractConfig } from "@/lib/platform-config"
import { releaseCouponForBooking } from "@/lib/coupons"
import { findOverlappingItem } from "@/lib/booking-availability"
import { hasPickupAddress, redactOwnerAddress } from "@/lib/ownerAddress"
import { criarPayoutDaReserva } from "@/lib/payout"
import { emitCancellationRefund } from "@/lib/payments/refund"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const { id } = await params
    const booking = await prisma.booking.findUnique({
      where:  { id },
      select: {
        id:            true,
        status:        true,
        paymentStatus: true,
        startDate:     true,
        endDate:       true,
        totalDays:     true,
        dailyPrice:    true,
        totalPrice:    true,
        discountCents: true,
        depositAmount: true,
        borrowerNote:  true,
        ownerNote:     true,
        cancelledAt:   true,
        cancelReason:  true,
        createdAt:     true,
        updatedAt:     true,
        // Fonte: app/reservas/[id]/page.tsx linhas 84-96 — mesmos timestamps de
        // histórico (deriveBookingHistory), status de pagamento e extensão que
        // o site usa. Ausentes aqui antes (mobile assumia que existiam — os
        // checks de paymentStatus/activatedAt/etc. rodavam sempre com undefined).
        respondedAt:               true,
        paidAt:                    true,
        contractSignedAt:          true,
        activatedAt:               true,
        returnRequestedAt:         true,
        returnedAt:                true,
        extensionRequestedAt:      true,
        extensionRespondedAt:      true,
        extensionStatus:           true,
        extensionRequestedEndDate: true,
        lateFeeAmount:             true,
        pickupTokenUsedAt:         true,
        photos: { select: { id: true, url: true, phase: true, createdAt: true }, orderBy: { createdAt: "asc" } },
        item: {
          select: {
            id:     true,
            title:  true,
            city:   true,
            state:  true,
            images: { select: { url: true }, orderBy: { order: "asc" } },
          },
        },
        // Story B — itens da locação (fonte: app/reservas/[id]/page.tsx linhas 107-114)
        bookingItems: {
          select: {
            itemId:     true,
            totalPrice: true,
            item: { select: { title: true, images: { select: { url: true }, orderBy: { order: "asc" }, take: 1 } } },
          },
        },
        borrower: { select: userMiniSelect },
        // Endereço de retirada — fonte: app/reservas/[id]/page.tsx linhas 120-125, 371-395
        owner: {
          select: {
            ...userMiniSelect,
            cep: true, street: true, neighborhood: true, city: true, state: true,
          },
        },
        conversation: { select: { id: true } },
        pickupToken:  true,
      reviews:      {
          select: {
            id:         true,
            reviewType: true,
            rating:     true,
            comment:    true,
            reviewer:   { select: { id: true, name: true } },
            createdAt:  true,
          },
        },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: { code: "BOOKING_NOT_FOUND", message: "Reserva não encontrada." } },
        { status: 404 },
      )
    }

    const isOwner = booking.owner.id === userId
    if (booking.borrower.id !== userId && !isOwner) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso negado." } },
        { status: 403 },
      )
    }

    // O endereço do proprietário só vai para quem tem direito a ele — ver
    // redactOwnerAddress. Ser participante da reserva NÃO basta: qualquer pessoa
    // cria uma reserva sem o dono aceitar.
    return NextResponse.json({
      data: {
        ...booking,
        owner: redactOwnerAddress(booking.owner, {
          isOwner,
          isPaid: booking.paymentStatus === "PAID",
        }),
      },
    })
  } catch (e) {
    console.error("[GET /api/bookings/:id]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}

// Transições permitidas por status atual e ação
const TRANSITIONS: Record<
  string,
  { requiredStatus: BookingStatus[]; allowedRole: "owner" | "borrower" | "both"; nextStatus: BookingStatus; requiresReason?: boolean }
> = {
  confirm:       { requiredStatus: ["PENDING"],              allowedRole: "owner",    nextStatus: "CONFIRMED" },
  cancel:        { requiredStatus: ["PENDING", "CONFIRMED"], allowedRole: "both",     nextStatus: "CANCELLED", requiresReason: true },
  mark_active:   { requiredStatus: ["CONFIRMED"],            allowedRole: "owner",    nextStatus: "ACTIVE" },
  mark_returned:  { requiredStatus: ["ACTIVE"],               allowedRole: "borrower", nextStatus: "RETURNED"  },
  confirm_return: { requiredStatus: ["RETURNED"],             allowedRole: "owner",    nextStatus: "COMPLETED" },
  open_dispute:   { requiredStatus: ["ACTIVE", "RETURNED"],  allowedRole: "both",     nextStatus: "DISPUTED",  requiresReason: true },
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    // Bearer (app mobile) OU cookie (web) — igual ao GET acima. Antes usava
    // apenas auth() (cookie), então TODA ação de ciclo de vida da reserva pelo
    // app (confirm/cancel/mark_active/mark_returned/confirm_return) caía em 401.
    const userId = await resolveUserId(req)
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const { id } = await params
    const body   = await req.json()
    const parsed = PatchBookingSchema.safeParse(body)
    if (!parsed.success) {
      // Mensagem do campo que falhou, mesmo padrão das rotas irmãs
      // (bookings/[id]/extend, bookings/[id]/dispute): o genérico escondia qual
      // campo o Zod recusou.
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0]?.message ?? "Dados inválidos." } },
        { status: 400 },
      )
    }

    const { action, reason, actualTime, pickupToken } = parsed.data
    // Horário efetivo: usa o informado pelo usuário (se válido e no passado), senão o momento atual
    const effectiveTime = actualTime ? new Date(actualTime) : new Date()

    const booking = await prisma.booking.findUnique({
      where:  { id },
      select: {
        id: true, status: true, borrowerId: true, ownerId: true,
        itemId: true, startDate: true, endDate: true, totalPrice: true, totalDays: true,
        paymentStatus: true, stripePaymentIntentId: true,
        contractSignedAt: true, // guard do mark_active — ver abaixo
        pickupToken: true, pickupTokenUsedAt: true,
        bookingItems: { select: { itemId: true } }, // Story B — revalidar todos os itens no confirm
        item:     { select: { title: true } },
        borrower: { select: { email: true, name: true } },
        owner:    { select: { email: true, name: true, street: true } },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: { code: "BOOKING_NOT_FOUND", message: "Reserva não encontrada." } },
        { status: 404 },
      )
    }

    const isOwner    = booking.ownerId    === userId
    const isBorrower = booking.borrowerId === userId

    if (!isOwner && !isBorrower) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso negado." } },
        { status: 403 },
      )
    }

    const transition = TRANSITIONS[action]
    if (!transition) {
      return NextResponse.json(
        { error: { code: "INVALID_ACTION", message: "Ação não permitida." } },
        { status: 422 },
      )
    }
    if (!transition.requiredStatus.includes(booking.status)) {
      return NextResponse.json(
        { error: { code: "INVALID_TRANSITION", message: "Esta ação não é permitida no momento." } },
        { status: 422 },
      )
    }

    if (transition.allowedRole === "owner" && !isOwner) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Apenas o locador pode executar esta ação." } },
        { status: 403 },
      )
    }
    if (transition.allowedRole === "borrower" && !isBorrower) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Apenas o locatário pode executar esta ação." } },
        { status: 403 },
      )
    }

    // Endereço completo é exigência NO MOMENTO EM QUE HÁ UMA LOCAÇÃO, não no
    // cadastro (regra dos fundadores, 22/08/2026). `confirm` é esse momento: o
    // proprietário assume a locação e o locatário passa a precisar saber onde
    // buscar o item. Contexto do defeito: lib/ownerAddress.ts.
    if (action === "confirm" && !hasPickupAddress(booking.owner)) {
      return NextResponse.json(
        {
          error: {
            code: "OWNER_ADDRESS_REQUIRED",
            message: "Cadastre seu endereço em Meu Perfil → Endereço antes de confirmar. O locatário precisa saber onde retirar o item.",
          },
        },
        { status: 422 },
      )
    }

    if (transition.requiresReason && !reason?.trim()) {
      return NextResponse.json(
        { error: { code: "REASON_REQUIRED", message: "Motivo obrigatório para esta ação." } },
        { status: 400 },
      )
    }

    const now  = new Date()
    const data: Record<string, unknown> = { status: transition.nextStatus }
    let refundAmount = 0

    if (action === "cancel") {
      data.cancelledAt   = now
      data.cancelledById = userId
      data.cancelReason  = reason

      // 🪤 Só há reembolso se houve pagamento. Antes, cancelar uma reserva NUNCA
      // PAGA gravava refundAmount > 0 — um valor a devolver que ninguém pagou.
      // Como o estorno hoje é executado à mão no painel da Stripe, esse número
      // ia parar na fila de trabalho de uma pessoa como se fosse real.
      if (booking.paymentStatus === "PAID") {
        const cancelConfig = await getCancellationConfig()
        const refund = calcRefund(
          new Date(booking.startDate),
          now,
          booking.totalPrice,
          cancelConfig,
        )
        refundAmount        = refund.refundAmount
        data.refundAmount   = refund.refundAmount
        data.refundPercent  = refund.refundPercent
        // O motivo do reembolso é registrado internamente — não é exposto ao usuário via API
        console.warn(
          `[booking.cancel] id=${id} refundPercent=${refund.refundPercent} refundAmount=${refund.refundAmount} reason="${refund.reason}"`,
        )
      } else {
        data.refundAmount  = 0
        data.refundPercent = 0
      }
    }

    // 🪤 O motivo da disputa era EXIGIDO (TRANSITIONS.requiresReason) e depois
    // descartado: só o branch de `cancel` gravava `cancelReason`. A disputa
    // entrava no banco sem justificativa nenhuma, e quem fosse arbitrar abria o
    // caso sem saber do que se tratava. O campo é o mesmo que a rota dedicada
    // (bookings/[id]/dispute) já usa.
    if (action === "open_dispute") {
      data.cancelReason = reason
    }

    // Registra o tempo de resposta do proprietário (para badge de responsividade)
    // Apenas na primeira ação sobre uma reserva PENDING (confirm ou cancel pelo dono)
    if (
      booking.status === "PENDING" &&
      isOwner &&
      (action === "confirm" || action === "cancel")
    ) {
      data.respondedAt = now
    }

    // Grava horário real de retirada — exige token válido e o consome.
    // Regra: prazo de devolução = mesmo horário da retirada + totalDays.
    if (action === "mark_active") {
      if (booking.paymentStatus !== "PAID") {
        return NextResponse.json(
          {
            error: {
              code:    "PAYMENT_REQUIRED",
              message: "O pagamento da reserva ainda não foi confirmado. Aguarde a confirmação antes de retirar o item.",
            },
          },
          { status: 402 },
        )
      }
      if (!pickupToken) {
        return NextResponse.json(
          { error: { code: "TOKEN_REQUIRED", message: "Código de retirada obrigatório." } },
          { status: 400 },
        )
      }
      if (booking.pickupTokenUsedAt) {
        return NextResponse.json(
          { error: { code: "TOKEN_ALREADY_USED", message: "Este código já foi utilizado." } },
          { status: 409 },
        )
      }
      // 🪤 Contrato assinado é condição para o item trocar de mãos — quando o
      // aceite está LIGADO.
      //
      // O portão existia só na CRIAÇÃO da reserva (POST /api/bookings, via
      // rentalContractAcceptanceEnabled). A retirada nunca olhava para
      // `contractSignedAt`, então qualquer reserva que chegasse a CONFIRMED sem
      // assinatura — as criadas antes de ligar a flag, ou por qualquer caminho
      // que não passe pela criação — podia ser retirada e concluída sem contrato.
      // Visto ao vivo em staging: retirada às 14:15, assinatura às 14:18.
      //
      // Atrelado à MESMA flag do aceite: com ela OFF (padrão, gated D4) nada
      // muda. Isto não decide se o contrato é obrigatório — só faz a retirada
      // respeitar a decisão que a flag já carrega.
      const contratoCfg = await getRentalContractConfig()
      if (contratoCfg.enabled && !booking.contractSignedAt) {
        return NextResponse.json(
          {
            error: {
              code:    "CONTRACT_NOT_SIGNED",
              message: "O locatário precisa assinar o contrato antes da retirada.",
            },
          },
          { status: 422 },
        )
      }
      if (booking.pickupToken !== pickupToken) {
        return NextResponse.json(
          { error: { code: "TOKEN_INVALID", message: "Código de retirada inválido. Verifique com o locatário." } },
          { status: 422 },
        )
      }
      data.activatedAt      = effectiveTime
      data.pickupTokenUsedAt = effectiveTime
      // 🪤 O `endDate` passa a contar da retirada REAL — o locatário tem os N
      // dias contratados a partir de quando recebeu o item. Mas o `startDate`
      // ficava na data reservada: retirada antecipada produzia início DEPOIS do
      // fim, e a lista do locatário exibia o período invertido.
      // Depois de ativada, a locação é [retirada real, retirada + N dias].
      data.startDate         = effectiveTime
      data.endDate           = new Date(effectiveTime.getTime() + booking.totalDays * 24 * 60 * 60 * 1000)
    }

    // Grava horário de devolução em dois momentos distintos:
    //  - mark_returned (borrower inicia): grava returnRequestedAt (solicitação)
    //  - confirm_return (owner confirma): grava returnedAt (confirmação real)
    // Isso permite exibir "Devolução solicitada" e "Devolução confirmada" como
    // eventos separados no histórico da locação.
    if (action === "mark_returned") {
      // 🪤 Foto de devolução OBRIGATÓRIA (decisão do fundador, 2026-08-23).
      //
      // O checklist pedia 3 de 4 itens e tratava a foto como "recomendado", então
      // dava para o locatário atestar "item limpo e no estado recebido" e, no
      // minuto seguinte, abrir disputa dizendo que não funciona — sem uma única
      // imagem para o time de mediação decidir. Uma locação inteira fechou assim
      // em staging com ZERO fotos.
      //
      // A trava fica aqui e não só no ReturnChecklist porque o app mobile e
      // qualquer chamada direta à API passam por este mesmo ponto.
      const fotos = await prisma.bookingPhoto.count({
        where: { bookingId: id, phase: "CHECKOUT" },
      })
      if (fotos === 0) {
        return NextResponse.json(
          {
            error: {
              code:    "RETURN_PHOTO_REQUIRED",
              message: "Envie ao menos uma foto do estado do item antes de iniciar a devolução.",
            },
          },
          { status: 422 },
        )
      }
      data.returnRequestedAt = effectiveTime
    }
    if (action === "confirm_return") {
      data.returnedAt = effectiveTime
    }

    // Gera pickupToken único no confirm (fluxo PIX/manual — Stripe gera o próprio via webhook).
    if (action === "confirm" && !booking.pickupToken) {
      let token: string | null = null
      for (let attempt = 0; attempt < 12 && !token; attempt++) { // ARQ-ALTO-14: teto de tentativas
        const candidate = String(randomInt(100000, 1000000))
        const conflict  = await prisma.booking.findFirst({ where: { pickupToken: candidate }, select: { id: true } })
        if (!conflict) token = candidate
      }
      if (!token) {
        return NextResponse.json(
          { error: { code: "INTERNAL_ERROR", message: "Não foi possível gerar o código de retirada. Tente novamente." } },
          { status: 500 },
        )
      }
      data.pickupToken = token
    }

    // Update atômico por ação (S14-A-05/A-06 — evita double-booking e ativação dupla em corrida).
    const updateSelect = { id: true, status: true, updatedAt: true, ownerNetAmount: true, ownerId: true } as const
    let updated: { id: string; status: BookingStatus; updatedAt: Date; ownerNetAmount: number | null; ownerId: string }

    if (action === "confirm") {
      // Conflito de datas + update na MESMA transação serializável.
      // Antes o check ficava fora de transação → race de double-booking (dois confirms simultâneos).
      try {
        const result = await prisma.$transaction(async (tx) => {
          // Disponibilidade de TODOS os itens da locação via booking_items (Story B) —
          // não só o item principal, senão um item secundário podia ser double-booked no confirm.
          const itemIds = booking.bookingItems.length > 0
            ? booking.bookingItems.map((bi) => bi.itemId)
            : [booking.itemId]
          const conflictItem = await findOverlappingItem(tx, itemIds, booking.startDate, booking.endDate, id)
          if (conflictItem) return null
          return tx.booking.update({ where: { id }, data, select: updateSelect })
        }, { isolationLevel: "Serializable" })

        if (!result) {
          return NextResponse.json(
            { error: { code: "DATE_CONFLICT", message: "Item já reservado para este período." } },
            { status: 409 },
          )
        }
        updated = result
      } catch (e) {
        // Falha de serialização (corrida simultânea) → trata como conflito de datas
        if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2034") {
          return NextResponse.json(
            { error: { code: "DATE_CONFLICT", message: "Item já reservado para este período." } },
            { status: 409 },
          )
        }
        throw e
      }
    } else if (action === "mark_active") {
      // Update condicional: só ativa se o token ainda não foi consumido (evita ativação dupla em retry/duplo-clique).
      const res = await prisma.booking.updateMany({ where: { id, pickupTokenUsedAt: null }, data })
      if (res.count === 0) {
        return NextResponse.json(
          { error: { code: "TOKEN_ALREADY_USED", message: "Este código já foi utilizado." } },
          { status: 409 },
        )
      }
      updated = await prisma.booking.findUniqueOrThrow({ where: { id }, select: updateSelect })
    } else {
      updated = await prisma.booking.update({ where: { id }, data, select: updateSelect })
    }

    // FIN-3.3 — criar Payout elegível N dias após devolução confirmada.
    // A lógica mora em lib/payout.ts porque a resolução de disputa pelo admin
    // (resolve_completed) leva ao MESMO estado terminal e precisa do mesmo repasse.
    if (action === "confirm_return") {
      await criarPayoutDaReserva(id, booking.ownerId, updated.ownerNetAmount, "confirm_return")
        .catch((e) => console.error("[FIN-3.3] criarPayoutDaReserva:", e instanceof Error ? e.message : e))
    }

    // Estorno automático (pauta-raimundo-2026-08-22, item 1 — decisão "automatizar").
    // `reverseOwnerTransfer` (repasse já feito ao proprietário, se houver) roda via
    // webhook `charge.refunded`, disparado por este próprio refunds.create.
    if (action === "cancel" && refundAmount > 0) {
      if (booking.stripePaymentIntentId) {
        await emitCancellationRefund({
          bookingId:       id,
          paymentIntentId: booking.stripePaymentIntentId,
          amount:          refundAmount,
        }).catch((e) => console.error("[booking.cancel] emitCancellationRefund:", e instanceof Error ? e.message : e))
      } else {
        console.error(`[booking.cancel] id=${id} refundAmount=${refundAmount} mas sem stripePaymentIntentId — estorno não pôde ser emitido`)
      }
    }

    // E-mails transacionais — após a resposta.
    // Rótulo multi-item (Story B): cita o item principal + "+ mais N itens" quando a locação tem vários.
    const itemsLabel = bookingItemsLabel(booking.item.title, booking.bookingItems.length || 1)
    if (action === "confirm") {
      after(() =>
        sendBookingConfirmedEmail(
          booking.borrower.email, booking.borrower.name,
          itemsLabel, id,
          booking.startDate, booking.endDate,
        ).catch((e) => console.error("[email] booking confirmed:", e instanceof Error ? e.message : e))
      )
    }
    if (action === "cancel") {
      const notifyEmail = isOwner ? booking.borrower.email : booking.owner.email
      const notifyName  = isOwner ? booking.borrower.name  : booking.owner.name
      const notifyRole  = isOwner ? "borrower" as const    : "owner" as const
      after(() =>
        sendBookingCancelledEmail(
          notifyEmail, notifyName, notifyRole,
          itemsLabel, id, reason ?? undefined,
        ).catch((e) => console.error("[email] booking cancelled:", e instanceof Error ? e.message : e))
      )
      // P3-20: devolve o cupom usado nesta reserva — após a resposta
      after(() => releaseCouponForBooking(id))
    }
    // Devolução iniciada pelo locatário (ACTIVE → "Devolução em Andamento") — avisa o locador
    if (action === "mark_returned") {
      after(() =>
        sendReturnInProgressEmail(
          booking.owner.email, booking.owner.name,
          booking.borrower.name, itemsLabel, id,
        ).catch((e) => console.error("[email] return in progress:", e instanceof Error ? e.message : e))
      )
    }
    // Recebimento confirmado pelo locador (→ COMPLETED) — avisa AMBAS as partes
    if (action === "confirm_return") {
      after(() =>
        sendReturnCompletedEmail(
          booking.borrower.email, booking.borrower.name,
          booking.owner.email, booking.owner.name,
          itemsLabel, id,
        ).catch((e) => console.error("[email] return completed:", e instanceof Error ? e.message : e))
      )
    }

    // Webhooks de saída — após a resposta
    const webhookEventMap: Partial<Record<typeof action, WebhookEvent>> = {
      confirm:        "booking.confirmed",
      cancel:         "booking.cancelled",
      mark_active:    "booking.active",
      mark_returned:  "booking.returned",
      confirm_return: "booking.completed",
    }
    const webhookEvent = webhookEventMap[action]
    if (webhookEvent) {
      after(() =>
        dispatchWebhookEvent(booking.ownerId, webhookEvent, {
          bookingId: id,
          itemTitle: booking.item.title,
          status:    transition.nextStatus,
          reason,
        })
      )
    }

    // Notificações — após a resposta
    const notifyUserId = isOwner ? booking.borrowerId : booking.ownerId
    const notifMap: Partial<Record<typeof action, { type: string; title: string; body: string }>> = {
      confirm:        { type: "BOOKING_CONFIRMED",  title: "Reserva confirmada!",        body: `Sua reserva de "${booking.item.title}" foi confirmada.` },
      cancel:         { type: "BOOKING_CANCELLED",  title: "Reserva cancelada",          body: `A reserva de "${booking.item.title}" foi cancelada.` },
      mark_returned:  { type: "BOOKING_RETURNED",   title: "Devolução em andamento",     body: `O locatário iniciou a devolução de "${booking.item.title}". Confira o item e confirme o recebimento.` },
      confirm_return: { type: "BOOKING_RETURNED",   title: "Devolução confirmada!",      body: `O proprietário confirmou a devolução de "${booking.item.title}". A reserva está concluída.` },
      // Faltava: abrir disputa por esta rota não avisava ninguém. A outra parte
      // descobria só ao abrir o app. `quemAbriu` é quem AGIU, não quem recebe —
      // ver o bug espelhado em bookings/[id]/dispute.
      open_dispute:   { type: "BOOKING_CANCELLED",  title: "Disputa aberta",             body: `O ${isOwner ? "locador" : "locatário"} abriu uma disputa em "${booking.item.title}". A equipe ShareO vai analisar o caso.` },
    }
    const notif = notifMap[action]
    if (notif) {
      after(() =>
        prisma.notification.create({
          data: { userId: notifyUserId, type: notif.type as never, title: notif.title, body: notif.body, data: { bookingId: id } },
        }).catch((e) => console.error(`[notification] ${action}:`, e instanceof Error ? e.message : e))
      )
    }

    return NextResponse.json({ data: updated })
  } catch (e) {
    console.error("[PATCH /api/bookings/:id]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
