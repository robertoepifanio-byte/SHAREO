/**
 * Mutação de abrir disputa — compartilhada pelos dois endpoints que fazem
 * isso: PATCH /api/bookings/:id (action=open_dispute, o único que o web e o
 * app de fato chamam) e POST /api/bookings/:id/dispute (rota dedicada mais
 * antiga, sem chamador interno hoje, mantida por compatibilidade).
 *
 * Antes deste módulo, as duas rotas tinham cada uma sua própria cópia de
 * "grava DISPUTED + cancelReason, notifica o outro lado" — igual à
 * duplicação da janela de disputa em lib/disputeWindow.ts, mesmo achado de
 * altitude (revisão /simplify, pauta-raimundo-2026-08-22 item 3).
 *
 * A checagem de auth, o fetch da reserva e a validação do corpo da
 * requisição continuam em cada rota — os contratos de entrada são
 * genuinamente diferentes (PATCH aceita `reason` livre; o POST dedicado
 * aceita um enum + descrição + foto opcional). Só a mutação em si e a
 * notificação são compartilhadas.
 */
import { after } from "next/server"
import { prisma } from "@/lib/prisma"

export async function openDispute({
  bookingId,
  cancelReason,
  isOwner,
  openedById,
  ownerId,
  borrowerId,
  itemTitle,
  reasonLabel,
  photoUrl,
}: {
  bookingId:    string
  cancelReason: string
  isOwner:      boolean
  /** Quem abriu. Só essa pessoa pode cancelar a própria disputa depois. */
  openedById:   string
  ownerId:      string
  borrowerId:   string
  itemTitle:    string
  /** Quando presente, entra no corpo da notificação (rota dedicada com motivo estruturado). */
  reasonLabel?: string
  photoUrl?:    string | null
}): Promise<{ id: string; status: string; disputeStatus: string; updatedAt: Date }> {
  // 🪤 `status` NÃO é tocado. Abrir disputa não interrompe a locação: a reserva
  // segue ACTIVE ou RETURNED e continua devolvível. Até 01/09/2026 esta linha
  // gravava `status: "DISPUTED"`, o que sobrescrevia — e destruía — o ciclo de
  // vida, deixando a reserva sem nenhuma ação possível para as duas partes.
  const updated = await prisma.booking.update({
    where:  { id: bookingId },
    data:   {
      disputeStatus:     "OPEN",
      disputeOpenedAt:   new Date(),
      disputeOpenedById: openedById,
      cancelReason,
    },
    select: { id: true, status: true, disputeStatus: true, updatedAt: true },
  })

  // 🪤 `papelDeQuemAbriu` descreve QUEM ABRIU, não quem recebe — os dois papéis
  // são opostos: quem recebe é o outro lado de quem agiu.
  const notifyUserId     = isOwner ? borrowerId : ownerId
  const papelDeQuemAbriu = isOwner ? "locador" : "locatário"
  const body = reasonLabel
    ? `O ${papelDeQuemAbriu} abriu uma disputa em "${itemTitle}": ${reasonLabel}.`
    : `O ${papelDeQuemAbriu} abriu uma disputa em "${itemTitle}". A equipe ShareO vai analisar o caso.`

  after(() =>
    prisma.notification.create({
      data: {
        userId: notifyUserId,
        type:   "BOOKING_CANCELLED", // reutiliza tipo existente; o body indica disputa
        title:  "Disputa aberta",
        body,
        data:   { bookingId, photoUrl: photoUrl ?? null },
      },
    }).catch((e) => console.error("[openDispute] notification:", e instanceof Error ? e.message : e))
  )

  return updated
}
