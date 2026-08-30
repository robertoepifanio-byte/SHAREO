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
  ownerId,
  borrowerId,
  itemTitle,
  reasonLabel,
  photoUrl,
}: {
  bookingId:    string
  cancelReason: string
  isOwner:      boolean
  ownerId:      string
  borrowerId:   string
  itemTitle:    string
  /** Quando presente, entra no corpo da notificação (rota dedicada com motivo estruturado). */
  reasonLabel?: string
  photoUrl?:    string | null
}): Promise<{ id: string; status: string; updatedAt: Date }> {
  const updated = await prisma.booking.update({
    where:  { id: bookingId },
    data:   { status: "DISPUTED", cancelReason },
    select: { id: true, status: true, updatedAt: true },
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
