import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { requireAdminApi } from "@/lib/auth/require-admin"
import { prisma } from "@/lib/prisma"
import { criarPayoutDaReserva } from "@/lib/payout"
import { emitCancellationRefund } from "@/lib/payments/refund"
import { getPlatformFeeRate, calcSplit } from "@/lib/platform-config"
import { formatPrice } from "@/utils/format"
import { prazoParaContestar } from "@/lib/prazoContestacao"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const PatchSchema = z.object({
  action:   z.enum(["resolve_completed", "resolve_cancelled", "dismiss_dispute", "resolve_partial"]),
  adminNote: z.string().max(500).optional(),
  /** Centavos a devolver ao locatário — só em resolve_partial. */
  refundAmount: z.number().int().positive().optional(),
}).refine(
  // O desfecho proporcional precisa de um valor; sem ele nao ha o que dividir.
  (d) => d.action !== "resolve_partial" || typeof d.refundAmount === "number",
  { message: "Informe quanto devolver ao locatário.", path: ["refundAmount"] },
).refine(
  // Mesma razao do dismiss: aqui um humano decide quanto cada lado recebe.
  (d) => d.action !== "resolve_partial" || !!d.adminNote?.trim(),
  { message: "Explique como chegou a esse valor.", path: ["adminNote"] },
).refine(
  // 🪤 `dismiss_dispute` é o único desfecho SEM consequência financeira: não
  // conclui, não cancela, não estorna, não repassa. Sem justificativa obrigatória
  // ele vira caixa-preta — meses depois ninguém sabe por que a mediação parou.
  // Os outros dois deixam rastro no dinheiro; este só deixa no que o admin escrever.
  (d) => d.action !== "dismiss_dispute" || !!d.adminNote?.trim(),
  { message: "Explique por que a disputa está sendo encerrada.", path: ["adminNote"] },
)

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    // Disputas pertencem a FINANCEIRO e a OPERACIONAL (matriz de papeis no
    // CLAUDE.md), nunca a um "admin" generico: `role === "ADMIN"` sozinho
    // aceitava qualquer papel presente ou futuro, inclusive um criado sem que
    // ninguem revisasse esta rota.
    const { session, error } = await requireAdminApi(
      "ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO", "ADMIN_OPERACIONAL",
    )
    if (error) return error

    const { id } = await params
    const body   = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code:    "VALIDATION_ERROR",
            // A mensagem do campo que falhou — o generico "Ação inválida"
            // escondia a nota obrigatória do dismiss_dispute e o admin nao
            // tinha como saber o que corrigir.
            message: parsed.error.issues[0]?.message ?? "Ação inválida.",
          },
        },
        { status: 400 },
      )
    }

    const booking = await prisma.booking.findUnique({
      where:  { id },
      select: {
        id: true, status: true, disputeStatus: true, borrowerId: true, ownerId: true,
        // Necessários para o desfecho financeiro da disputa — ver abaixo.
        ownerNetAmount: true, totalPrice: true, paymentStatus: true,
        stripePaymentIntentId: true, // origem do estorno parcial
        discountCents: true,
        item: { select: { title: true } },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Reserva não encontrada." } },
        { status: 404 },
      )
    }

    if (booking.disputeStatus !== "OPEN") {
      return NextResponse.json(
        { error: { code: "INVALID_STATUS", message: "Reserva não está em disputa." } },
        { status: 422 },
      )
    }

    const { action, adminNote, refundAmount } = parsed.data

    // Guardas do desfecho proporcional. Ficam ANTES de qualquer escrita: um
    // estorno recusado depois de a reserva ja ter sido marcada como resolvida
    // deixaria o banco dizendo que o locatario recebeu dinheiro que nao saiu.
    if (action === "resolve_partial") {
      if (booking.paymentStatus !== "PAID") {
        return NextResponse.json(
          { error: { code: "NAO_PAGA", message: "Não há o que estornar: a reserva não foi paga." } },
          { status: 422 },
        )
      }
      if (!booking.stripePaymentIntentId) {
        return NextResponse.json(
          { error: { code: "SEM_COBRANCA", message: "A reserva não tem cobrança na Stripe para estornar." } },
          { status: 422 },
        )
      }
      if (refundAmount! >= booking.totalPrice) {
        return NextResponse.json(
          {
            error: {
              code:    "VALOR_INVALIDO",
              message: "Para devolver o valor integral, use \"Cancelar reserva e estornar\".",
            },
          },
          { status: 422 },
        )
      }
    }
    // Um desfecho, duas consequências: onde a RESERVA para e como a DISPUTA
    // fecha. Ficam na mesma tabela para não poderem divergir — dois ternários
    // sobre `action` são duas chances de alguém corrigir só um deles.
    //
    // `nextStatus: null` em dismiss_dispute é a correção 4 do Thiago: encerrar
    // a disputa NÃO decide nada sobre a locação, que segue seu curso.
    const OUTCOME = {
      resolve_completed: { nextStatus: "COMPLETED" as const, disputeStatus: "RESOLVED_OWNER"    as const },
      resolve_cancelled: { nextStatus: "CANCELLED" as const, disputeStatus: "RESOLVED_BORROWER" as const },
      dismiss_dispute:   { nextStatus: null,                 disputeStatus: "DISMISSED"         as const },
      // Proporcional: a locação ACONTECEU (por isso COMPLETED), mas parte do
      // valor volta ao locatário. Item 2 da pauta de 01/09 — Políticas 3.3 já
      // prometiam "reembolso parcial" e o sistema só sabia tudo-ou-nada.
      resolve_partial:   { nextStatus: "COMPLETED" as const, disputeStatus: "RESOLVED_PARTIAL"  as const },
    }
    const { nextStatus, disputeStatus } = OUTCOME[action]
    const adminId = session.user.id

    const updated = await prisma.booking.update({
      where: { id },
      data:  {
        // Só grava `status` quando o desfecho de fato move a locação. Em
        // dismiss_dispute a reserva fica exatamente onde estava.
        ...(nextStatus && { status: nextStatus }),
        // A disputa é encerrada junto com o desfecho. Campo separado do
        // `status` desde 01/09/2026: quem lê a fila do admin, o gate do
        // repasse e o selo da tela olham `disputeStatus`, não `status`.
        disputeStatus,
        disputeResolvedAt: new Date(),
        ...(nextStatus === "CANCELLED" && {
          cancelledAt:   new Date(),
          cancelledById: adminId,
          cancelReason:  adminNote ?? "Resolvido pelo administrador.",
          // 🪤 Estorno da disputa: INTEGRAL, e de propósito NÃO usa calcRefund.
          //
          // A escada do cancelamento (100% / 70% / 50% conforme a proximidade da
          // retirada) pune quem desiste em cima da hora. Em disputa a demora é do
          // processo de mediação, não do locatário — e a disputa só existe depois
          // da retirada, então a escada quase sempre cairia em 50%. Dar 50% a
          // quem o admin acabou de dar razão é indefensável.
          // Decisão do fundador, 2026-08-23.
          //
          // Só grava se o dinheiro entrou: valor a devolver numa reserva nunca
          // paga vira trabalho real na fila de alguém (mesma regra do #345).
          ...(booking.paymentStatus === "PAID"
            ? { refundAmount: booking.totalPrice, refundPercent: 100 }
            : { refundAmount: 0, refundPercent: 0 }),
        }),
        ...(action === "resolve_partial" && {
          refundAmount:  refundAmount!,
          // Percentual para leitura humana; a fonte do valor e `refundAmount`.
          refundPercent: Math.round((refundAmount! / booking.totalPrice) * 100),
        }),
        ...(nextStatus === "COMPLETED" && adminNote && {
          ownerNote: adminNote,
        }),
      },
      select: { id: true, status: true, disputeStatus: true, updatedAt: true },
    })

    // 🪤 Desfecho FINANCEIRO da disputa — não existia.
    //
    // `resolve_completed` leva a reserva ao MESMO estado terminal que o
    // `confirm_return` (COMPLETED), mas não criava repasse nenhum: o
    // proprietário ganhava a disputa e nunca recebia, sem nada no banco
    // registrando que um repasse deixou de existir. Isto aplica aqui a mesma
    // regra que já valia no caminho sem disputa — não é política nova.
    if (nextStatus === "COMPLETED") {
      // 🪤 No desfecho proporcional o repasse NAO e o `ownerNetAmount` gravado:
      // parte do dinheiro volta ao locatario e nao pode ser repassada tambem.
      //
      // A divisao segue a mesma regra do checkout, aplicada ao que FICOU:
      // sobre `totalPrice - refundAmount` incidem a taxa da plataforma e o
      // liquido do proprietario. Isso mantem os extremos coerentes — devolver
      // tudo daria repasse zero, devolver nada daria o repasse cheio — e faz a
      // plataforma abrir mao da comissao sobre a parte devolvida, que e o mesmo
      // criterio ja adotado no estorno integral (decisao do fundador, 23/08).
      let liquidoDoProprietario = booking.ownerNetAmount
      if (action === "resolve_partial") {
        const feeRate = await getPlatformFeeRate()
        liquidoDoProprietario = calcSplit(booking.totalPrice - refundAmount!, feeRate).ownerNetAmount
      }

      const r = await criarPayoutDaReserva(id, booking.ownerId, liquidoDoProprietario, "resolve_completed")
        .catch((e) => {
          console.error("[disputa] criarPayoutDaReserva:", e instanceof Error ? e.message : e)
          return null
        })
      if (r && !r.criado) {
        console.warn(`[disputa] id=${id} resolvida a favor do proprietário SEM repasse — motivo=${r.motivo}`)
      }
    }

    // O estorno em si. Depois do update e do repasse, e com o erro registrado
    // em vez de engolido: `booking.refundAmount` fica no banco como o valor
    // devido, entao um estorno recusado pela Stripe da para reprocessar.
    if (action === "resolve_partial") {
      await emitCancellationRefund({
        bookingId:       id,
        paymentIntentId: booking.stripePaymentIntentId!,
        amount:          refundAmount!,
        motivo:          "dispute-partial",
      }).catch((e) =>
        console.error(`[disputa] estorno parcial de ${refundAmount} em ${id} FALHOU:`, e instanceof Error ? e.message : e)
      )
    }

    after(() =>
      prisma.adminLog.create({
        data: {
          adminId,
          action:     action.toUpperCase(),
          entityType: "Booking",
          entityId:   id,
          metadata:   {
            adminNote:    adminNote ?? null,
            refundAmount: refundAmount ?? null,
          },
        },
      }).catch((e) => console.error("[adminLog]", e instanceof Error ? e.message : e))
    )

    // Notificar ambas as partes — após a resposta
    // 🪤 O corpo antigo era um ternário sobre `nextStatus` e só sabia dizer
    // "concluída" ou "cancelada". Em dismiss_dispute nenhuma das duas é
    // verdade: a reserva não mudou de estado, e avisar as partes de um
    // cancelamento que não houve seria pior que não avisar nada.
    // O prazo de contestação (5 dias úteis) estava só no texto publicado; sem
    // a data na notificação, o usuário teria de descobrir sozinho quando vence.
    const prazoContestacao = prazoParaContestar(new Date())
    const ateQuando = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Fortaleza",
    }).format(prazoContestacao)

    const corpoDaResolucao = action === "resolve_partial"
      ? `A disputa de "${booking.item.title}" foi resolvida com acordo parcial: ${formatPrice(refundAmount!)} devolvidos ao locatário e o restante repassado ao proprietário.`
      : nextStatus === null
      ? `A disputa de "${booking.item.title}" foi encerrada pela equipe ShareO. A locação segue normalmente.`
      : `A reserva de "${booking.item.title}" foi ${nextStatus === "COMPLETED" ? "concluída" : "cancelada"} pelo administrador.`
    after(() =>
      Promise.allSettled(
        [booking.borrowerId, booking.ownerId].map((userId) =>
          prisma.notification.create({
            data: {
              userId,
              type:  "BOOKING_CANCELLED",
              title: nextStatus === null ? "Disputa encerrada" : "Disputa resolvida",
              // O prazo entra em TODO desfecho: qualquer decisão pode ser
              // contestada, inclusive o encerramento sem efeito financeiro.
              body:  `${corpoDaResolucao} Se discordar, escreva para suporte@shareo.com.br até ${ateQuando}.`,
              data:  { bookingId: id },
            },
          }).catch((e) => console.error("[notification dispute resolved]", e instanceof Error ? e.message : e))
        )
      )
    )

    return NextResponse.json({ data: updated })
  } catch (e) {
    console.error("[PATCH /api/admin/disputes/:id]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
