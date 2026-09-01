import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { criarPayoutDaReserva } from "@/lib/payout"
import { z } from "zod"

type Params = { params: Promise<{ id: string }> }

const PatchSchema = z.object({
  action:   z.enum(["resolve_completed", "resolve_cancelled", "dismiss_dispute"]),
  adminNote: z.string().max(500).optional(),
}).refine(
  // 🪤 `dismiss_dispute` é o único desfecho SEM consequência financeira: não
  // conclui, não cancela, não estorna, não repassa. Sem justificativa obrigatória
  // ele vira caixa-preta — meses depois ninguém sabe por que a mediação parou.
  // Os outros dois deixam rastro no dinheiro; este só deixa no que o admin escrever.
  (d) => d.action !== "dismiss_dispute" || !!d.adminNote?.trim(),
  { message: "Explique por que a disputa está sendo encerrada.", path: ["adminNote"] },
)

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso restrito a administradores." } },
        { status: 403 },
      )
    }

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

    const { action, adminNote } = parsed.data
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
      const r = await criarPayoutDaReserva(id, booking.ownerId, booking.ownerNetAmount, "resolve_completed")
        .catch((e) => {
          console.error("[disputa] criarPayoutDaReserva:", e instanceof Error ? e.message : e)
          return null
        })
      if (r && !r.criado) {
        console.warn(`[disputa] id=${id} resolvida a favor do proprietário SEM repasse — motivo=${r.motivo}`)
      }
    }

    after(() =>
      prisma.adminLog.create({
        data: {
          adminId,
          action:     action.toUpperCase(),
          entityType: "Booking",
          entityId:   id,
          metadata:   { adminNote: adminNote ?? null },
        },
      }).catch((e) => console.error("[adminLog]", e instanceof Error ? e.message : e))
    )

    // Notificar ambas as partes — após a resposta
    // 🪤 O corpo antigo era um ternário sobre `nextStatus` e só sabia dizer
    // "concluída" ou "cancelada". Em dismiss_dispute nenhuma das duas é
    // verdade: a reserva não mudou de estado, e avisar as partes de um
    // cancelamento que não houve seria pior que não avisar nada.
    const corpoDaResolucao = nextStatus === null
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
              body:  corpoDaResolucao,
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
